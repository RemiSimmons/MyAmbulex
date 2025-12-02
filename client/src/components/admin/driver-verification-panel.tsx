import { useState } from 'react';
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Eye, 
  FileText, 
  Shield,
  Clock,
  User,
  Car,
  CreditCard,
  AlertCircle,
  ExternalLink,
  LockOpen
} from "lucide-react";

interface Document {
  type: string;
  url: string | null;
  title: string;
  isVerified: boolean | null;
}

interface DriverVerificationPanelProps {
  driverId: number;
  driverUserId: number;
  driverName: string;
  driverEmail: string;
  applicationStatus: string;
  documentsList: Document[];
  onVerified?: () => void;
}

export function DriverVerificationPanel({
  driverId,
  driverUserId,
  driverName,
  driverEmail,
  applicationStatus,
  documentsList,
  onVerified
}: DriverVerificationPanelProps) {
  const { toast } = useToast();
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null);

  // Verify document mutation
  const verifyDocumentMutation = useMutation({
    mutationFn: async ({ documentType, action, reason }: { 
      documentType: string; 
      action: 'verify' | 'reject'; 
      reason?: string;
    }) => {
      const endpoint = action === 'verify' 
        ? `/api/admin/drivers/${driverId}/verify-document`
        : `/api/admin/drivers/${driverId}/reject-document`;
      
      return apiRequest('POST', endpoint, {
        documentType,
        rejectionReason: reason || undefined
      });
    },
    onSuccess: () => {
      toast({
        title: "Document updated",
        description: `Document has been ${selectedDocType === 'verify' ? 'verified' : 'rejected'} successfully.`
      });
      setRejectionReason('');
      setSelectedDocType(null);
      // Invalidate both the drivers list and the specific driver's documents
      queryClient.invalidateQueries({ queryKey: ['/api/admin/drivers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/documents', driverId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/documents', driverUserId] });
      if (onVerified) onVerified();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update document status",
        variant: "destructive"
      });
    }
  });

  // Approve driver mutation
  const approveDriverMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/admin/drivers/${driverId}/approve`);
    },
    onSuccess: () => {
      toast({
        title: "Driver approved",
        description: `${driverName} has been approved to start driving.`
      });
      // Invalidate both the drivers list and the specific driver's documents
      queryClient.invalidateQueries({ queryKey: ['/api/admin/drivers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/documents', driverId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/documents', driverUserId] });
      if (onVerified) onVerified();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to approve driver",
        variant: "destructive"
      });
    }
  });

  // Unlock account mutation
  const unlockAccountMutation = useMutation({
    mutationFn: async ({ reason }: { reason?: string }) => {
      return apiRequest('POST', `/api/admin/drivers/${driverId}/unlock-account`, {
        reason: reason || 'Account unlocked for document re-upload'
      });
    },
    onSuccess: () => {
      toast({
        title: "Account unlocked",
        description: `${driverName}'s account has been unlocked and they can now log in to re-upload documents.`
      });
      // Invalidate both the drivers list and the specific driver's documents
      queryClient.invalidateQueries({ queryKey: ['/api/admin/drivers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/documents', driverId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/documents', driverUserId] });
      if (onVerified) onVerified();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to unlock account",
        variant: "destructive"
      });
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending Review</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'suspended':
        return <Badge variant="secondary">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'license':
        return <CreditCard className="h-4 w-4" />;
      case 'insurance':
        return <Shield className="h-4 w-4" />;
      case 'vehicle':
        return <Car className="h-4 w-4" />;
      case 'profile':
        return <User className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getDocumentStatusBadge = (isVerified: boolean | null) => {
    if (isVerified === true) {
      return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
    }
    if (isVerified === false) {
      return <Badge variant="destructive">Rejected</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  const handleDocumentAction = async (documentType: string, action: 'verify' | 'reject') => {
    if (action === 'reject' && !rejectionReason.trim()) {
      toast({
        title: "Rejection reason required",
        description: "Please provide a reason for rejecting this document.",
        variant: "destructive"
      });
      return;
    }

    verifyDocumentMutation.mutate({
      documentType,
      action,
      reason: action === 'reject' ? rejectionReason : undefined
    });
  };

  const allDocumentsVerified = documentsList.every(doc => doc.isVerified === true);
  const hasRejectedDocs = documentsList.some(doc => doc.isVerified === false);

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Driver Verification</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {driverName} - {driverEmail}
            </p>
          </div>
          {getStatusBadge(applicationStatus)}
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="documents" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="space-y-4">
            <div className="grid gap-4">
              {documentsList.map((doc) => (
                <Card key={doc.type} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getDocumentIcon(doc.type)}
                        <div>
                          <h4 className="font-medium">{doc.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {doc.url ? 'Document uploaded' : 'No document uploaded'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {getDocumentStatusBadge(doc.isVerified)}
                        
                        {doc.url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (doc.url) {
                                window.open(doc.url, '_blank');
                              }
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        )}
                        
                        {doc.url && doc.isVerified !== true && (
                          <div className="flex space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDocumentAction(doc.type, 'verify')}
                              disabled={verifyDocumentMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Verify
                            </Button>
                            
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedDocType(doc.type)}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </DialogTrigger>
                              <DialogContent aria-describedby="reject-dialog-description">
                                <DialogHeader>
                                  <DialogTitle>Reject Document: {doc.title}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <p id="reject-dialog-description" className="text-sm text-muted-foreground">
                                    Provide a detailed reason for rejecting this document. The driver will receive this feedback.
                                  </p>
                                  <div>
                                    <Label htmlFor="reason">Reason for rejection</Label>
                                    <Textarea
                                      id="reason"
                                      placeholder="Please provide a detailed reason for rejecting this document..."
                                      value={rejectionReason}
                                      onChange={(e) => setRejectionReason(e.target.value)}
                                      className="mt-2"
                                    />
                                  </div>
                                  <div className="flex justify-end space-x-2">
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setRejectionReason('');
                                        setSelectedDocType(null);
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={() => handleDocumentAction(doc.type, 'reject')}
                                      disabled={verifyDocumentMutation.isPending || !rejectionReason.trim()}
                                    >
                                      Reject Document
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <div className="space-y-4">
              {/* Overall Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Overall Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Application Status</span>
                      {getStatusBadge(applicationStatus)}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Documents Verified</span>
                      <span className="font-medium">
                        {documentsList.filter(doc => doc.isVerified === true).length} / {documentsList.length}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Documents Rejected</span>
                      <span className="font-medium text-red-600">
                        {documentsList.filter(doc => doc.isVerified === false).length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Admin Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {allDocumentsVerified && applicationStatus === 'pending' && (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        All documents have been verified. You can now approve this driver.
                      </AlertDescription>
                    </Alert>
                  )}

                  {hasRejectedDocs && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Some documents have been rejected. The driver will need to re-upload them.
                        {applicationStatus === 'pending' && " Their account has been automatically unlocked for document re-upload."}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {allDocumentsVerified && applicationStatus === 'pending' && (
                      <Button
                        onClick={() => approveDriverMutation.mutate()}
                        disabled={approveDriverMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve Driver
                      </Button>
                    )}
                    
                    {(hasRejectedDocs || applicationStatus === 'suspended') && (
                      <Button
                        onClick={() => unlockAccountMutation.mutate({ reason: 'Account unlocked for document re-upload' })}
                        disabled={unlockAccountMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <LockOpen className="h-4 w-4 mr-2" />
                        Unlock Account
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      onClick={() => window.location.reload()}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Refresh Status
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
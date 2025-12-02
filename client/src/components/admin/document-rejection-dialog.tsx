import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertTriangle, 
  FileText, 
  XCircle,
  Send,
  RefreshCw
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface DocumentRejectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  driverId: number;
  driverName: string;
  driverEmail: string;
  availableDocuments: Array<{
    type: string;
    field: string;
    title: string;
    status: 'uploaded' | 'missing' | 'not_uploaded';
    required: boolean;
    verified?: boolean;
  }>;
}

interface RejectionRequest {
  documentType: string;
  documentTitle: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  reuploadRequired: boolean;
}

export function DocumentRejectionDialog({
  isOpen,
  onClose,
  driverId,
  driverName,
  driverEmail,
  availableDocuments
}: DocumentRejectionDialogProps) {
  const [rejectionRequests, setRejectionRequests] = useState<RejectionRequest[]>([]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [unlockAccount, setUnlockAccount] = useState(true);
  const [sendNotification, setSendNotification] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const rejectDocumentsMutation = useMutation({
    mutationFn: async (rejectionData: {
      driverId: number;
      rejectionRequests: RejectionRequest[];
      generalNotes: string;
      unlockAccount: boolean;
      sendNotification: boolean;
    }) => {
      const response = await fetch(`/api/admin/reject-documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rejectionData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to reject documents');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Documents Rejected",
        description: `${driverName} has been notified about the document rejections and can now re-upload.`,
      });
      // Invalidate all relevant caches for real-time UI updates
      queryClient.invalidateQueries({ queryKey: ['/api/admin/drivers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/documents', driverId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      onClose();
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to reject documents. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setRejectionRequests([]);
    setGeneralNotes('');
    setUnlockAccount(true);
    setSendNotification(true);
  };

  const addRejectionRequest = (documentType: string, documentTitle: string) => {
    const exists = rejectionRequests.find(req => req.documentType === documentType);
    if (exists) return;

    setRejectionRequests([
      ...rejectionRequests,
      {
        documentType,
        documentTitle,
        reason: '',
        priority: 'medium',
        reuploadRequired: true,
      }
    ]);
  };

  const updateRejectionRequest = (documentType: string, field: keyof RejectionRequest, value: any) => {
    setRejectionRequests(requests =>
      requests.map(req =>
        req.documentType === documentType
          ? { ...req, [field]: value }
          : req
      )
    );
  };

  const removeRejectionRequest = (documentType: string) => {
    setRejectionRequests(requests =>
      requests.filter(req => req.documentType !== documentType)
    );
  };

  const handleSubmit = () => {
    // Validate that all rejection requests have reasons
    const invalidRequests = rejectionRequests.filter(req => !req.reason.trim());
    
    if (invalidRequests.length > 0) {
      toast({
        title: "Missing Rejection Reasons",
        description: "Please provide a reason for each document rejection.",
        variant: "destructive",
      });
      return;
    }

    if (rejectionRequests.length === 0) {
      toast({
        title: "No Documents Selected",
        description: "Please select at least one document to reject.",
        variant: "destructive",
      });
      return;
    }

    rejectDocumentsMutation.mutate({
      driverId,
      rejectionRequests,
      generalNotes,
      unlockAccount,
      sendNotification,
    });
  };

  const uploadedDocuments = availableDocuments.filter(doc => doc.status === 'uploaded');
  const requiredDocuments = availableDocuments.filter(doc => doc.required);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span>Reject Documents - {driverName}</span>
          </DialogTitle>
          <DialogDescription>
            Select documents to reject and provide specific feedback. The driver will be notified and can re-upload the documents.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Driver Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Driver Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Driver Name</Label>
                  <p className="text-sm">{driverName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="text-sm">{driverEmail}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Document Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Documents</CardTitle>
              <p className="text-sm text-muted-foreground">
                Select documents to reject. Only uploaded documents can be rejected.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                {uploadedDocuments.map((doc) => (
                  <div
                    key={doc.type}
                    className={`flex items-center justify-between p-3 border rounded-lg ${
                      rejectionRequests.find(req => req.documentType === doc.type)
                        ? 'border-destructive bg-destructive/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant={doc.status === 'uploaded' ? 'default' : 'secondary'}>
                            {doc.status}
                          </Badge>
                          {doc.required && (
                            <Badge variant="outline" className="text-xs">Required</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {rejectionRequests.find(req => req.documentType === doc.type) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeRejectionRequest(doc.type)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      ) : (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => addRejectionRequest(doc.type, doc.title)}
                          disabled={doc.status !== 'uploaded'}
                        >
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Rejection Details */}
          {rejectionRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Rejection Details</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Provide specific feedback for each rejected document.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {rejectionRequests.map((request) => (
                  <div key={request.documentType} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{request.documentTitle}</h4>
                      <Badge variant="destructive">To be rejected</Badge>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor={`reason-${request.documentType}`}>
                          Reason for rejection *
                        </Label>
                        <Textarea
                          id={`reason-${request.documentType}`}
                          placeholder="Provide specific feedback on why this document is being rejected..."
                          value={request.reason}
                          onChange={(e) => updateRejectionRequest(request.documentType, 'reason', e.target.value)}
                          className="mt-2"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`priority-${request.documentType}`}>Priority</Label>
                          <select
                            id={`priority-${request.documentType}`}
                            value={request.priority}
                            onChange={(e) => updateRejectionRequest(request.documentType, 'priority', e.target.value)}
                            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="high">High - Required immediately</option>
                            <option value="medium">Medium - Required soon</option>
                            <option value="low">Low - Can be addressed later</option>
                          </select>
                        </div>
                        
                        <div className="flex items-center space-x-2 mt-6">
                          <Checkbox
                            id={`reupload-${request.documentType}`}
                            checked={request.reuploadRequired}
                            onCheckedChange={(checked) => 
                              updateRejectionRequest(request.documentType, 'reuploadRequired', checked)
                            }
                          />
                          <Label htmlFor={`reupload-${request.documentType}`} className="text-sm">
                            Require re-upload
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* General Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">General Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="general-notes">Additional notes for driver (optional)</Label>
                <Textarea
                  id="general-notes"
                  placeholder="Any additional information or guidance for the driver..."
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Action Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="unlock-account"
                  checked={unlockAccount}
                  onCheckedChange={(checked) => setUnlockAccount(checked === true)}
                />
                <Label htmlFor="unlock-account" className="text-sm">
                  Unlock account for immediate re-upload (recommended)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="send-notification"
                  checked={sendNotification}
                  onCheckedChange={(checked) => setSendNotification(checked === true)}
                />
                <Label htmlFor="send-notification" className="text-sm">
                  Send email notification to driver
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                onClose();
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={rejectDocumentsMutation.isPending || rejectionRequests.length === 0}
            >
              {rejectDocumentsMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Reject Documents ({rejectionRequests.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
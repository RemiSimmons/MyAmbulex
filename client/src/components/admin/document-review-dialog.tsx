import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  FileText, 
  Eye, 
  CheckCircle, 
  AlertTriangle, 
  Download,
  User,
  Calendar,
  MapPin,
  RefreshCw,
  X,
  Trash2
} from 'lucide-react';

interface DocumentInfo {
  type: string;
  field: string;
  url: string | null;
  uploaded: boolean;
  fileExists: boolean;
  required: boolean;
  status: 'uploaded' | 'missing' | 'not_uploaded' | 'approved' | 'rejected';
  certificationName?: string;
  verified?: boolean;
}

interface DocumentReviewData {
  driverId: number;
  driverName: string;
  documents: DocumentInfo[];
  summary: {
    total: number;
    uploaded: number;
    missing: number;
    notUploaded: number;
  };
}

interface DocumentReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  driverId: number | null;
  driverName: string;
}

export function DocumentReviewDialog({ isOpen, onClose, driverId, driverName }: DocumentReviewDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [verificationNotes, setVerificationNotes] = useState('');
  const [forceRender, setForceRender] = useState(0);

  // Debug logging for props
  useEffect(() => {
    console.log('📋 DIALOG PROPS DEBUG:', {
      isOpen,
      driverId,
      driverName,
      enabledCondition: isOpen && !!driverId
    });
  }, [isOpen, driverId, driverName]);

  // Force re-render when dialog opens or driver changes
  useEffect(() => {
    if (isOpen && driverId) {
      console.log('📋 FORCING RE-RENDER for driver:', driverId);
      setForceRender(prev => prev + 1);
      // Also clear all document-related cache
      queryClient.removeQueries({ queryKey: ['/api/admin/documents'] });
    }
  }, [isOpen, driverId, queryClient]);

  // Use React Query for document fetching to maintain proper session context
  const {
    data: documentData,
    isLoading: loading,
    error: documentError,
    refetch: refetchDocuments
  } = useQuery({
    queryKey: ['/api/admin/documents', driverId, forceRender], // Include forceRender in query key
    queryFn: async () => {
      if (!driverId) {
        throw new Error('No driver ID provided');
      }
      
      console.log(`📋 REACT QUERY: Fetching documents for driver ID ${driverId} (render: ${forceRender})`);
      console.log('📋 REACT QUERY: Dialog isOpen:', isOpen, 'DriverId:', driverId);
      console.log('📋 REACT QUERY: Starting fresh API call (cache bypassed)');
      
      // Clear any browser-level cache with a unique timestamp
      const timestamp = Date.now();
      const url = `/api/admin/documents/${driverId}?_t=${timestamp}`;
      console.log('📋 REACT QUERY: Cache-busted URL:', url);
      
      try {
        const response = await apiRequest('GET', url);
        console.log('📋 REACT QUERY: Response status:', response.status);
        console.log('📋 REACT QUERY: Response headers:', Object.fromEntries(response.headers.entries()));
        
        // Check if response is actually JSON and not HTML (login page)
        const contentType = response.headers.get('Content-Type');
        console.log('📋 REACT QUERY: Response content type:', contentType);
        
        if (!response.ok) {
          console.error('📋 REACT QUERY: Response not OK:', response.status, response.statusText);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        if (contentType && contentType.includes('text/html')) {
          console.error('📋 REACT QUERY: Received HTML instead of JSON - authentication failed');
          const htmlText = await response.text();
          console.log('📋 REACT QUERY: HTML response preview:', htmlText.substring(0, 500));
          throw new Error('Authentication failed - received login page instead of JSON data');
        }
        
        const data = await response.json();
        console.log('📋 REACT QUERY: Successfully parsed JSON data:', data);
        console.log('📋 REACT QUERY: Document count:', data.documents?.length || 0);
        console.log('📋 REACT QUERY: First few documents:', data.documents?.slice(0, 3));
        
        // Force complete object creation to prevent any reference issues
        const cleanData = JSON.parse(JSON.stringify({
          driverId: data.driverId || driverId,
          driverName: data.driverName || driverName,
          documents: data.documents || [],
          summary: data.summary || {
            total: 0,
            uploaded: 0,
            missing: 0,
            notUploaded: 0
          }
        }));
        
        console.log('📋 REACT QUERY: Returning clean data:', cleanData);
        return cleanData;
      } catch (error) {
        console.error('📋 REACT QUERY: Detailed error info:', {
          error: error.message,
          stack: error.stack,
          driverId,
          isOpen
        });
        throw error;
      }
    },
    enabled: isOpen && !!driverId,
    retry: false, // Don't retry on authentication errors
    refetchOnWindowFocus: false,
    // Force fresh data on every dialog open
    staleTime: 0,
    gcTime: 0, // Previously cacheTime in older versions
    refetchOnMount: true,
    refetchOnReconnect: false
  });

  // Handle errors from React Query
  useEffect(() => {
    if (documentError) {
      console.error('📋 REACT QUERY ERROR:', documentError);
      toast({
        title: "Authentication Error",
        description: "Failed to load driver documents. Please refresh the page and try again.",
        variant: "destructive",
      });
    }
  }, [documentError, toast]);

  // Reset onboarding mutation
  const resetOnboardingMutation = useMutation({
    mutationFn: async (driverIdToReset: number) => {
      return apiRequest('POST', `/api/admin/drivers/${driverIdToReset}/reset-onboarding`, {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Driver onboarding has been reset successfully. The driver can now re-upload documents.",
      });
      // Invalidate both the drivers list and the specific driver's documents
      queryClient.invalidateQueries({ queryKey: ['/api/admin/drivers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/documents', driverId] });
      refetchDocuments(); // Refresh current data
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reset driver onboarding process",
        variant: "destructive",
      });
    },
  });

  // Clear documents mutation
  const clearDocumentsMutation = useMutation({
    mutationFn: async (driverIdToClear: number) => {
      return apiRequest('POST', `/api/admin/drivers/${driverIdToClear}/clear-documents`, {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "All driver documents have been cleared successfully.",
      });
      // Invalidate both the drivers list and the specific driver's documents
      queryClient.invalidateQueries({ queryKey: ['/api/admin/drivers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/documents', driverId] });
      refetchDocuments(); // Refresh current data
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear driver documents",
        variant: "destructive",
      });
    },
  });

  // Clear individual document mutation
  const clearIndividualDocumentMutation = useMutation({
    mutationFn: async ({ driverIdToClear, documentField }: { driverIdToClear: number; documentField: string }) => {
      return apiRequest('POST', `/api/admin/drivers/${driverIdToClear}/clear-document`, {
        documentField
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Success",
        description: `${variables.documentField.replace('_', ' ')} document has been cleared successfully.`,
      });
      // Invalidate both the drivers list and the specific driver's documents
      queryClient.invalidateQueries({ queryKey: ['/api/admin/drivers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/documents', driverId] });
      refetchDocuments(); // Refresh current data
    },
    onError: (_, variables) => {
      toast({
        title: "Error",
        description: `Failed to clear ${variables.documentField.replace('_', ' ')} document`,
        variant: "destructive",
      });
    },
  });


  const viewDocument = async (documentField: string) => {
    if (!driverId || !documentData) return;
    
    // Find the document by field to get its actual URL
    const document = documentData.documents.find(doc => doc.field === documentField);
    if (!document || !document.url) {
      toast({
        title: "Document Not Found",
        description: "The requested document could not be found or has no URL",
        variant: "destructive",
      });
      return;
    }
    
    console.log('📋 VIEW DOCUMENT: Viewing document for field:', documentField);
    console.log('📋 VIEW DOCUMENT: Found document URL:', document.url);
    
    try {
      // Use the actual document URL from the document data
      const url = document.url;
      
      // Open document in new tab with authentication
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include', // Include cookies for authentication
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "Authentication Error",
            description: "Please login as admin to view documents",
            variant: "destructive",
          });
          return;
        } else if (response.status === 403) {
          toast({
            title: "Access Denied",
            description: "Admin access required to view documents",
            variant: "destructive",
          });
          return;
        } else if (response.status === 404) {
          toast({
            title: "Document Not Found",
            description: "The requested document could not be found",
            variant: "destructive",
          });
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Get the document blob and create a URL for it
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      // Open in new window
      const newWindow = window.open(blobUrl, '_blank');
      
      // Clean up the blob URL after the window opens
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 1000);
      
      if (!newWindow) {
        toast({
          title: "Popup Blocked",
          description: "Please allow popups to view documents",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      toast({
        title: "Error",
        description: "Could not open document",
        variant: "destructive",
      });
    }
  };

  const verifyDocument = async (documentField: string, verified: boolean) => {
    if (!driverId) return;
    
    try {
      const response = await fetch(`/api/admin/documents/${driverId}/${documentField}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verified,
          notes: verificationNotes
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Document ${verified ? 'approved' : 'rejected'} successfully`,
        });
        
        // Refresh admin panel data
        refetchDocuments();
        queryClient.invalidateQueries({ queryKey: [`/api/admin/documents/${driverId}`] });
        // Invalidate both the drivers list and the specific driver's documents
      queryClient.invalidateQueries({ queryKey: ['/api/admin/drivers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/documents', driverId] });
        
        setVerificationNotes('');
      } else {
        toast({
          title: "Error",
          description: "Failed to update document status",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not update document verification",
        variant: "destructive",
      });
    }
  };

  const clearIndividualDocument = (documentField: string) => {
    if (driverId) {
      clearIndividualDocumentMutation.mutate({ 
        driverIdToClear: driverId, 
        documentField 
      });
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="loading-dialog-description">
          <DialogHeader>
            <DialogTitle>Loading Documents...</DialogTitle>
            <DialogDescription id="loading-dialog-description">
              Please wait while we load the driver's document information.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" aria-describedby="document-review-description">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Document Review - {driverName}</span>
          </DialogTitle>
          <DialogDescription id="document-review-description">
            Review and verify driver documents. You can approve, reject, or view uploaded documents.
          </DialogDescription>
        </DialogHeader>

        {documentData ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{documentData?.summary?.total || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Uploaded</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{documentData?.summary?.uploaded || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Missing Files</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{documentData?.summary?.missing || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Not Uploaded</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{documentData?.summary?.notUploaded || 0}</div>
                </CardContent>
              </Card>
            </div>

            {/* Document List */}
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All Documents</TabsTrigger>
                <TabsTrigger value="uploaded">Uploaded ({documentData?.summary?.uploaded || 0})</TabsTrigger>
                <TabsTrigger value="missing">Missing ({documentData?.summary?.missing || 0})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({documentData?.summary?.notUploaded || 0})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                {(() => {
                  console.log('📋 RENDERING DOCUMENTS:', {
                    driverId: documentData?.driverId,
                    driverName: documentData?.driverName,
                    documentCount: documentData?.documents?.length || 0,
                    firstThreeDocuments: documentData?.documents?.slice(0, 3)?.map(d => ({
                      type: d.type,
                      field: d.field,
                      url: d.url
                    })) || []
                  });
                  return (documentData.documents || []).map((doc, index) => (
                    <DocumentCard 
                      key={`${driverId}-${doc.field}-${forceRender}-${index}`}
                      document={doc} 
                      onView={viewDocument} 
                      onVerify={verifyDocument} 
                      onClearDocument={clearIndividualDocument}
                    />
                  ));
                })()}
              </TabsContent>

              <TabsContent value="uploaded" className="space-y-4">
                {(documentData.documents || []).filter(doc => doc.uploaded === true && doc.url).map((doc, index) => (
                  <DocumentCard 
                    key={index} 
                    document={doc} 
                    onView={viewDocument} 
                    onVerify={verifyDocument} 
                    onClearDocument={clearIndividualDocument}
                  />
                ))}
              </TabsContent>

              <TabsContent value="missing" className="space-y-4">
                {(documentData.documents || []).filter(doc => doc.status === 'missing').map((doc, index) => (
                  <DocumentCard 
                    key={index} 
                    document={doc} 
                    onView={viewDocument} 
                    onVerify={verifyDocument} 
                    onClearDocument={clearIndividualDocument}
                  />
                ))}
              </TabsContent>

              <TabsContent value="pending" className="space-y-4">
                {(documentData.documents || []).filter(doc => doc.status === 'not_uploaded').map((doc, index) => (
                  <DocumentCard 
                    key={index} 
                    document={doc} 
                    onView={viewDocument} 
                    onVerify={verifyDocument} 
                    onClearDocument={clearIndividualDocument}
                  />
                ))}
              </TabsContent>
            </Tabs>

            {/* Verification Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Admin Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Add notes about document verification..."
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  className="min-h-20"
                />
              </CardContent>
            </Card>

            {/* Reset Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-red-600">Reset Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Use these actions to reset the driver's onboarding process if they need to re-upload documents.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        if (driverId) {
                          resetOnboardingMutation.mutate(driverId);
                        }
                      }}
                      disabled={resetOnboardingMutation.isPending || !driverId}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${resetOnboardingMutation.isPending ? 'animate-spin' : ''}`} />
                      {resetOnboardingMutation.isPending ? 'Resetting...' : 'Reset Onboarding'}
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        if (driverId) {
                          clearDocumentsMutation.mutate(driverId);
                        }
                      }}
                      disabled={clearDocumentsMutation.isPending || !driverId}
                    >
                      <Trash2 className={`h-4 w-4 mr-2 ${clearDocumentsMutation.isPending ? 'animate-spin' : ''}`} />
                      {clearDocumentsMutation.isPending ? 'Clearing...' : 'Clear Documents'}
                    </Button>
                  </div>
                  <div className="text-xs text-gray-500">
                    <strong>Reset Onboarding:</strong> Clears verification status and sends notification to driver<br/>
                    <strong>Clear Documents:</strong> Removes all uploaded files and resets document status
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
            <p className="text-lg font-medium">No Document Data Available</p>
            <p className="text-sm text-muted-foreground">Driver has not uploaded any documents yet.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface DocumentCardProps {
  document: DocumentInfo;
  onView: (field: string) => void;
  onVerify: (field: string, verified: boolean) => void;
  onClearDocument: (field: string) => void;
}

function DocumentCard({ document, onView, onVerify, onClearDocument }: DocumentCardProps) {
  const getStatusBadge = (document: DocumentInfo) => {
    switch (document.status) {
      case 'uploaded':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Uploaded</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'missing':
        return <Badge variant="destructive">File Missing</Badge>;
      case 'not_uploaded':
        return <Badge variant="secondary">Not Uploaded</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="h-5 w-5 text-blue-500" />
            <div>
              <h4 className="font-medium">{document.type}</h4>
              {document.required && (
                <Badge variant="outline" className="text-xs mt-1">Required</Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {getStatusBadge(document)}
            
            {(document.status === 'uploaded' || document.status === 'approved' || document.status === 'rejected') && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(document.field)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                {document.status !== 'approved' && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onVerify(document.field, true)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                )}
                {document.status !== 'rejected' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onVerify(document.field, false)}
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onClearDocument(document.field)}
                  className="border-orange-200 text-orange-600 hover:bg-orange-50"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
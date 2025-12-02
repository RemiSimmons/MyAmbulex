import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Eye, 
  Calendar,
  Clock,
  RefreshCw,
  Camera,
  Download,
  Share2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface DocumentType {
  id: string;
  name: string;
  description: string;
  required: boolean;
  acceptedFormats: string[];
  maxSizeMB: number;
  expiryWarningDays: number;
}

interface UploadedDocument {
  id: string;
  type: string;
  fileName: string;
  uploadDate: string;
  expiryDate?: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  rejectionReason?: string;
  fileUrl: string;
  fileSize: number;
  verifiedBy?: string;
  verifiedAt?: string;
}

interface DocumentUploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

const DOCUMENT_TYPES: DocumentType[] = [
  {
    id: 'drivers_license_front',
    name: "Driver's License (Front)",
    description: 'Clear photo of the front of your driver\'s license',
    required: true,
    acceptedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeMB: 5,
    expiryWarningDays: 30
  },
  {
    id: 'drivers_license_back',
    name: "Driver's License (Back)",
    description: 'Clear photo of the back of your driver\'s license',
    required: true,
    acceptedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeMB: 5,
    expiryWarningDays: 30
  },
  {
    id: 'insurance_policy',
    name: 'Insurance Policy',
    description: 'Current auto insurance policy document',
    required: true,
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSizeMB: 10,
    expiryWarningDays: 30
  },
  {
    id: 'vehicle_registration',
    name: 'Vehicle Registration',
    description: 'Current vehicle registration document',
    required: true,
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSizeMB: 10,
    expiryWarningDays: 30
  },
  {
    id: 'background_check',
    name: 'Background Check',
    description: 'Recent background check report (if required)',
    required: false,
    acceptedFormats: ['application/pdf'],
    maxSizeMB: 15,
    expiryWarningDays: 365
  },
  {
    id: 'medical_certificate',
    name: 'Medical Certificate',
    description: 'Medical fitness certificate (if required)',
    required: false,
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSizeMB: 10,
    expiryWarningDays: 90
  }
];

export function DocumentReuploadSystem() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: DocumentUploadProgress }>({});
  const [previewDocument, setPreviewDocument] = useState<UploadedDocument | null>(null);

  // Fetch existing documents
  const { data: existingDocuments, isLoading } = useQuery<UploadedDocument[]>({
    queryKey: ['/api/driver/documents'],
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ documentType, file, expiryDate }: { 
      documentType: string; 
      file: File; 
      expiryDate?: string;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      if (expiryDate) {
        formData.append('expiryDate', expiryDate);
      }

      // Simulate upload progress
      setUploadProgress(prev => ({
        ...prev,
        [documentType]: {
          fileName: file.name,
          progress: 0,
          status: 'uploading'
        }
      }));

      // Create XMLHttpRequest for progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(prev => ({
              ...prev,
              [documentType]: {
                ...prev[documentType],
                progress
              }
            }));
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            setUploadProgress(prev => ({
              ...prev,
              [documentType]: {
                ...prev[documentType],
                status: 'processing'
              }
            }));
            
            setTimeout(() => {
              setUploadProgress(prev => ({
                ...prev,
                [documentType]: {
                  ...prev[documentType],
                  status: 'complete',
                  progress: 100
                }
              }));
              resolve(JSON.parse(xhr.responseText));
            }, 1000);
          } else {
            setUploadProgress(prev => ({
              ...prev,
              [documentType]: {
                ...prev[documentType],
                status: 'error',
                error: 'Upload failed'
              }
            }));
            reject(new Error('Upload failed'));
          }
        };

        xhr.onerror = () => {
          setUploadProgress(prev => ({
            ...prev,
            [documentType]: {
              ...prev[documentType],
              status: 'error',
              error: 'Network error'
            }
          }));
          reject(new Error('Network error'));
        };

        xhr.open('POST', '/api/driver/upload-document');
        xhr.send(formData);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/driver/documents'] });
      toast({
        title: "Document Uploaded",
        description: "Your document has been uploaded successfully and is being reviewed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive",
      });
    }
  });

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await apiRequest('DELETE', `/api/driver/documents/${documentId}`);
      if (!response.ok) throw new Error('Failed to delete document');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/driver/documents'] });
      toast({
        title: "Document Deleted",
        description: "Document has been successfully deleted.",
      });
    }
  });

  // Handle file selection
  const handleFileSelect = async (documentType: string, file: File, expiryDate?: string) => {
    const docType = DOCUMENT_TYPES.find(dt => dt.id === documentType);
    if (!docType) return;

    // Validate file type
    if (!docType.acceptedFormats.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: `Please upload a file in one of these formats: ${docType.acceptedFormats.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > docType.maxSizeMB) {
      toast({
        title: "File Too Large",
        description: `File size must be less than ${docType.maxSizeMB}MB`,
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate({ documentType, file, expiryDate });
  };

  // Get document status
  const getDocumentStatus = (documentType: string) => {
    return existingDocuments?.find(doc => doc.type === documentType);
  };

  // Check if document is expiring soon
  const isExpiringDoon = (doc: UploadedDocument) => {
    if (!doc.expiryDate) return false;
    const expiryDate = new Date(doc.expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const docType = DOCUMENT_TYPES.find(dt => dt.id === doc.type);
    return daysUntilExpiry <= (docType?.expiryWarningDays || 30);
  };

  // Calculate overall completion percentage
  const getCompletionPercentage = () => {
    const requiredDocs = DOCUMENT_TYPES.filter(dt => dt.required);
    const completedDocs = requiredDocs.filter(dt => {
      const doc = getDocumentStatus(dt.id);
      return doc && doc.status === 'approved';
    });
    return Math.round((completedDocs.length / requiredDocs.length) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Document Management</h2>
          <p className="text-muted-foreground">Upload and manage your verification documents</p>
        </div>
        <Badge variant={getCompletionPercentage() === 100 ? 'default' : 'secondary'}>
          {getCompletionPercentage()}% Complete
        </Badge>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Overall Completion</span>
              <span>{getCompletionPercentage()}%</span>
            </div>
            <Progress value={getCompletionPercentage()} />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {existingDocuments?.filter(d => d.status === 'approved').length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {existingDocuments?.filter(d => d.status === 'pending').length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {existingDocuments?.filter(d => d.status === 'rejected' || d.status === 'expired').length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Needs Attention</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expiring Documents Alert */}
      {existingDocuments?.some(doc => isExpiringDoon(doc)) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have documents expiring soon. Please update them to avoid service interruption.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Upload Documents</TabsTrigger>
          <TabsTrigger value="status">Document Status</TabsTrigger>
          <TabsTrigger value="history">Upload History</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <div className="grid gap-6">
            {DOCUMENT_TYPES.map((docType) => {
              const existingDoc = getDocumentStatus(docType.id);
              const progress = uploadProgress[docType.id];
              const needsReupload = existingDoc && (existingDoc.status === 'rejected' || existingDoc.status === 'expired' || isExpiringDoon(existingDoc));

              return (
                <Card key={docType.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <FileText className="h-5 w-5" />
                          <span>{docType.name}</span>
                          {docType.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{docType.description}</p>
                      </div>
                      
                      {existingDoc && (
                        <Badge variant={
                          existingDoc.status === 'approved' ? 'default' :
                          existingDoc.status === 'pending' ? 'secondary' :
                          'destructive'
                        }>
                          {existingDoc.status}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Upload Area */}
                    <div className="border-2 border-dashed rounded-lg p-6">
                      <div className="text-center">
                        {progress ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-center space-x-2">
                              {progress.status === 'uploading' && <RefreshCw className="h-5 w-5 animate-spin" />}
                              {progress.status === 'processing' && <RefreshCw className="h-5 w-5 animate-spin" />}
                              {progress.status === 'complete' && <CheckCircle className="h-5 w-5 text-green-600" />}
                              {progress.status === 'error' && <AlertTriangle className="h-5 w-5 text-red-600" />}
                              <span className="font-medium">{progress.fileName}</span>
                            </div>
                            <Progress value={progress.progress} />
                            <p className="text-sm text-muted-foreground">
                              {progress.status === 'uploading' && `Uploading... ${progress.progress}%`}
                              {progress.status === 'processing' && 'Processing document...'}
                              {progress.status === 'complete' && 'Upload complete!'}
                              {progress.status === 'error' && progress.error}
                            </p>
                          </div>
                        ) : (
                          <>
                            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                            <p className="font-medium mb-2">
                              {needsReupload ? 'Update Document' : 'Upload Document'}
                            </p>
                            <p className="text-sm text-muted-foreground mb-4">
                              Accepted formats: {docType.acceptedFormats.join(', ')} (Max {docType.maxSizeMB}MB)
                            </p>
                            <div className="space-y-2">
                              <Input
                                type="file"
                                accept={docType.acceptedFormats.join(',')}
                                ref={(el) => fileInputRefs.current[docType.id] = el}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleFileSelect(docType.id, file);
                                  }
                                }}
                                className="hidden"
                              />
                              <Button
                                variant={needsReupload ? 'destructive' : 'outline'}
                                onClick={() => fileInputRefs.current[docType.id]?.click()}
                                disabled={uploadMutation.isPending}
                              >
                                {needsReupload ? 'Update Required' : 'Choose File'}
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Current Document Info */}
                    {existingDoc && (
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Current Document: {existingDoc.fileName}</p>
                            <p className="text-sm text-muted-foreground">
                              Uploaded: {new Date(existingDoc.uploadDate).toLocaleDateString()}
                              {existingDoc.expiryDate && ` • Expires: ${new Date(existingDoc.expiryDate).toLocaleDateString()}`}
                            </p>
                            {existingDoc.rejectionReason && (
                              <p className="text-sm text-red-600 mt-1">
                                Rejection Reason: {existingDoc.rejectionReason}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPreviewDocument(existingDoc)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteMutation.mutate(existingDoc.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Expiry Date Input for certain documents */}
                    {['drivers_license_front', 'insurance_policy', 'vehicle_registration'].includes(docType.id) && (
                      <div className="space-y-2">
                        <Label htmlFor={`${docType.id}-expiry`}>
                          Document Expiry Date {docType.required && '*'}
                        </Label>
                        <Input
                          id={`${docType.id}-expiry`}
                          type="date"
                          className="w-full"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="status" className="space-y-6">
          <div className="grid gap-4">
            {DOCUMENT_TYPES.map((docType) => {
              const doc = getDocumentStatus(docType.id);
              return (
                <Card key={docType.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5" />
                        <div>
                          <p className="font-medium">{docType.name}</p>
                          {doc ? (
                            <div className="text-sm text-muted-foreground">
                              {doc.fileName} • Uploaded {new Date(doc.uploadDate).toLocaleDateString()}
                              {doc.expiryDate && (
                                <span className={isExpiringDoon(doc) ? 'text-red-600' : ''}>
                                  {' • '}Expires {new Date(doc.expiryDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Not uploaded</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {doc ? (
                          <>
                            <Badge variant={
                              doc.status === 'approved' ? 'default' :
                              doc.status === 'pending' ? 'secondary' :
                              'destructive'
                            }>
                              {doc.status}
                            </Badge>
                            {isExpiringDoon(doc) && (
                              <Badge variant="destructive">Expiring Soon</Badge>
                            )}
                          </>
                        ) : (
                          <Badge variant="outline">Not Uploaded</Badge>
                        )}
                      </div>
                    </div>
                    
                    {doc?.rejectionReason && (
                      <Alert className="mt-4" variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{doc.rejectionReason}</AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Upload History</CardTitle>
            </CardHeader>
            <CardContent>
              {existingDocuments?.length > 0 ? (
                <div className="space-y-4">
                  {existingDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5" />
                        <div>
                          <p className="font-medium">{doc.fileName}</p>
                          <p className="text-sm text-muted-foreground">
                            {DOCUMENT_TYPES.find(dt => dt.id === doc.type)?.name} • 
                            {new Date(doc.uploadDate).toLocaleDateString()}
                            {doc.verifiedBy && ` • Verified by ${doc.verifiedBy}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={
                          doc.status === 'approved' ? 'default' :
                          doc.status === 'pending' ? 'secondary' :
                          'destructive'
                        }>
                          {doc.status}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewDocument(doc)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No documents uploaded yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Document Preview Modal would go here */}
      {previewDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">{previewDocument.fileName}</h3>
              <Button variant="ghost" onClick={() => setPreviewDocument(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="mb-4">
              <img 
                src={previewDocument.fileUrl} 
                alt="Document preview" 
                className="w-full h-auto max-h-96 object-contain border rounded"
              />
            </div>
            
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">
                  Status: {previewDocument.status} • 
                  Size: {(previewDocument.fileSize / (1024 * 1024)).toFixed(2)}MB
                </p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentReuploadSystem;
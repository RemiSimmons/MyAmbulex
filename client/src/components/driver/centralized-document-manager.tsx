import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  RefreshCw,
  Camera,
  Download,
  FileImage,
  FileType,
  Clock,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

interface DocumentInfo {
  id: string;
  title: string;
  description: string;
  fieldName: string;
  required: boolean;
  acceptedTypes: string[];
  maxSizeMB: number;
  currentUrl?: string;
  isVerified?: boolean;
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  uploadDate?: string;
  verifiedDate?: string;
  verifiedBy?: string;
}

interface CentralizedDocumentManagerProps {
  onDocumentChange: (docType: string, file: File | null) => void;
  uploadedDocuments: Record<string, File | null>;
}

// Helper function to format accepted file types in a user-friendly way
const formatAcceptedTypes = (types: string[]): string => {
  const formatted = types.map(type => {
    if (type === 'image/*') return 'Images (JPG, PNG, etc.)';
    if (type === 'application/pdf') return 'PDF documents';
    return type;
  });
  return formatted.join(' or ');
};

// Document configuration with all required documents
const DOCUMENT_TYPES: DocumentInfo[] = [
  {
    id: 'licensePhotoFront',
    title: "Driver's License (Front)",
    description: "Upload a clear photo of the front of your driver's license",
    fieldName: 'licensePhotoFront',
    required: true,
    acceptedTypes: ['image/*', 'application/pdf'],
    maxSizeMB: 5,
  },
  {
    id: 'licensePhotoBack',
    title: "Driver's License (Back)",
    description: "Upload a clear photo of the back of your driver's license",
    fieldName: 'licensePhotoBack',
    required: true,
    acceptedTypes: ['image/*', 'application/pdf'],
    maxSizeMB: 5,
  },
  {
    id: 'insuranceDocument',
    title: "Insurance Document",
    description: "Upload your insurance policy document",
    fieldName: 'insuranceDocumentUrl',
    required: true,
    acceptedTypes: ['image/*', 'application/pdf'],
    maxSizeMB: 5,
  },
  {
    id: 'vehicleRegistration',
    title: "Vehicle Registration",
    description: "Upload your vehicle registration document",
    fieldName: 'vehicleRegistrationUrl',
    required: true,
    acceptedTypes: ['image/*', 'application/pdf'],
    maxSizeMB: 5,
  },
  {
    id: 'mvrRecord',
    title: "Motor Vehicle Record (MVR)",
    description: "Upload your motor vehicle record (driving history)",
    fieldName: 'mvrRecordUrl',
    required: true,
    acceptedTypes: ['image/*', 'application/pdf'],
    maxSizeMB: 5,
  },
  {
    id: 'backgroundCheck',
    title: "Background Check Results",
    description: "Upload your background check results",
    fieldName: 'backgroundCheckDocumentUrl',
    required: true,
    acceptedTypes: ['image/*', 'application/pdf'],
    maxSizeMB: 5,
  },
  {
    id: 'drugTestResults',
    title: "Drug Test Results",
    description: "Upload your drug test results",
    fieldName: 'drugTestDocumentUrl',
    required: true,
    acceptedTypes: ['image/*', 'application/pdf'],
    maxSizeMB: 5,
  },
  {
    id: 'cprFirstAid',
    title: "CPR/First Aid Certification (Required)",
    description: "Upload your CPR/First Aid certification",
    fieldName: 'cprFirstAidCertificationUrl',
    required: true,
    acceptedTypes: ['image/*', 'application/pdf'],
    maxSizeMB: 5,
  },
  {
    id: 'basicLifeSupport',
    title: "Basic Life Support (BLS) - Required",
    description: "Upload your Basic Life Support certification (required)",
    fieldName: 'basicLifeSupportUrl',
    required: true,
    acceptedTypes: ['image/*', 'application/pdf'],
    maxSizeMB: 5,
  },
  {
    id: 'advancedLifeSupport',
    title: "Advanced Life Support (ALS) - Optional",
    description: "Upload your Advanced Life Support certification (optional)",
    fieldName: 'advancedLifeSupportUrl',
    required: false,
    acceptedTypes: ['image/*', 'application/pdf'],
    maxSizeMB: 5,
  },
  {
    id: 'emtCertification',
    title: "EMT Certification - Optional",
    description: "Upload your EMT certification (optional)",
    fieldName: 'emtCertificationUrl',
    required: false,
    acceptedTypes: ['image/*', 'application/pdf'],
    maxSizeMB: 5,
  },
  {
    id: 'paramedicCertification',
    title: "Paramedic Certification - Optional",
    description: "Upload your Paramedic certification (optional)",
    fieldName: 'paramedicCertificationUrl',
    required: false,
    acceptedTypes: ['image/*', 'application/pdf'],
    maxSizeMB: 5,
  },
  {
    id: 'profilePhoto',
    title: "Profile Photo",
    description: "Upload a professional profile photo",
    fieldName: 'profilePhoto',
    required: true,
    acceptedTypes: ['image/*'],
    maxSizeMB: 5,
  },
];

export function CentralizedDocumentManager({ 
  onDocumentChange, 
  uploadedDocuments 
}: CentralizedDocumentManagerProps) {
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState<Record<string, boolean>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing documents from database
  const { data: existingDocuments, isLoading: isLoadingDocuments, refetch } = useQuery({
    queryKey: ['/api/driver/documents'],
    retry: false,
  });

  // Also fetch registration progress to check for uploaded documents during onboarding
  const { data: registrationProgress } = useQuery({
    queryKey: ['/api/registration-progress'],
    retry: false,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ docType, file }: { docType: string; file: File }) => {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('documentType', docType);

      // Simulate upload progress
      setUploadProgress(prev => ({ ...prev, [docType]: 0 }));
      
      try {
        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to upload document');
        }

        return await response.json();
      } catch (error: any) {
        // Re-throw AbortErrors so they can be handled by onError
        if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
          throw error;
        }
        throw new Error(error.message || 'Upload failed');
      }
    },
    onSuccess: (data, { docType }) => {
      setUploadProgress(prev => ({ ...prev, [docType]: 100 }));
      
      toast({
        title: "Document uploaded successfully",
        description: `${getDocumentTitle(docType)} has been uploaded and is pending review.`,
      });
      
      // Clear the selected file
      setSelectedFiles(prev => ({ ...prev, [docType]: null }));
      
      // Clear the preview URL
      setPreviewUrls(prev => ({ ...prev, [docType]: '' }));
      
      // Reset the file input
      if (fileInputRefs.current[docType]) {
        fileInputRefs.current[docType]!.value = '';
      }
      
      // Use a gentle approach to refresh data - avoid race conditions
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/driver/documents'] });
        queryClient.invalidateQueries({ queryKey: ['/api/registration-progress'] });
      }, 100);
      
      // Clear upload progress after delay
      setTimeout(() => {
        setUploadProgress(prev => ({ ...prev, [docType]: 0 }));
      }, 2000);
    },
    onError: (error: any, { docType }) => {
      // Don't show errors for aborted requests
      if (error?.name === 'AbortError' || error?.message?.includes('aborted') || error?.message?.includes('cancelled')) {
        console.log('Upload request was aborted, not showing error to user:', error.message);
        setUploadProgress(prev => ({ ...prev, [docType]: 0 }));
        return;
      }
      
      setUploadProgress(prev => ({ ...prev, [docType]: 0 }));
      
      toast({
        title: "Upload failed",
        description: `Failed to upload ${getDocumentTitle(docType)}. Please try again.`,
        variant: "destructive"
      });
    },
  });

  // Get document title by type
  const getDocumentTitle = (docType: string) => {
    return DOCUMENT_TYPES.find(doc => doc.id === docType)?.title || docType;
  };

  // Get document status from existing documents
  const getDocumentStatus = (docType: string) => {
    const docInfo = DOCUMENT_TYPES.find(doc => doc.id === docType);
    if (!docInfo) return { url: null, isVerified: null, status: 'missing' };
    
    const fieldName = docInfo.fieldName;
    let url = null;
    let isVerified = null;
    
    // First check driver_details for finalized documents
    if (existingDocuments && typeof existingDocuments === 'object') {
      const docs = existingDocuments as any;
      url = docs[fieldName] || null;
      
      // Check verification status based on document type (using camelCase field names)
      if (docType === 'licensePhotoFront' || docType === 'licensePhotoBack') {
        isVerified = docs.licenseVerified;
      } else if (docType === 'insuranceDocument') {
        isVerified = docs.insuranceVerified;
      } else if (docType === 'vehicleRegistration') {
        isVerified = docs.vehicleVerified;
      } else if (docType === 'profilePhoto') {
        isVerified = docs.profileVerified;
      } else if (docType === 'backgroundCheck') {
        isVerified = docs.backgroundCheckVerified;
      } else if (docType === 'drugTestResults') {
        isVerified = docs.drugTestVerified;
      } else if (docType === 'mvrRecord') {
        isVerified = docs.mvrRecordVerified;
      } else if (docType === 'cprFirstAid') {
        isVerified = docs.cprFirstAidCertificationVerified;
      } else if (docType === 'basicLifeSupport') {
        isVerified = docs.basicLifeSupportVerified;
      } else if (docType === 'advancedLifeSupport') {
        isVerified = docs.advancedLifeSupportVerified;
      } else if (docType === 'emtCertification') {
        isVerified = docs.emtCertificationVerified;
      } else if (docType === 'paramedicCertification') {
        isVerified = docs.paramedicCertificationVerified;
      }
    }
    
    // If not found in driver_details, check registration progress (onboarding files)
    if (!url && registrationProgress && typeof registrationProgress === 'object' && (registrationProgress as any).formData) {
      const progressData = (registrationProgress as any).formData;
      
      // Map document types to registration progress field names
      const progressFieldMap: Record<string, string> = {
        'licensePhotoFront': 'licensePhotoFront',
        'licensePhotoBack': 'licensePhotoBack',
        'insuranceDocument': 'insuranceDocumentUrl',
        'vehicleRegistration': 'vehicleRegistrationUrl',
        'cprFirstAid': 'cprFirstAidCertificationUrl',
        'basicLifeSupport': 'basicLifeSupportUrl',
        'advancedLifeSupport': 'advancedLifeSupportUrl',
        'emtCertification': 'emtCertificationUrl',
        'paramedicCertification': 'paramedicCertificationUrl',
        'backgroundCheck': 'backgroundCheckDocumentUrl',
        'mvrRecord': 'mvrRecordUrl',
        'drugTestResults': 'drugTestDocumentUrl',
        'profilePhoto': 'profilePhoto'
      };
      
      const progressFieldName = progressFieldMap[docType];
      if (progressFieldName && progressData && typeof progressData === 'object' && (progressData as any)[progressFieldName]) {
        url = `/uploads/${(progressData as any)[progressFieldName]}`;
        // Only set isVerified to null if we don't already have a verification status from driver_details
        if (isVerified === null) {
          isVerified = null; // Documents in progress are not yet verified
        }
      }
    }
    
    return {
      url,
      isVerified,
      status: url ? (isVerified === true ? 'verified' : isVerified === false ? 'rejected' : 'pending') : 'missing'
    };
  };

  // Handle file selection
  const handleFileSelect = (docType: string, file: File | null) => {
    if (!file) return;
    
    const docInfo = DOCUMENT_TYPES.find(doc => doc.id === docType);
    if (!docInfo) return;
    
    // Validate file type
    const isValidType = docInfo.acceptedTypes.some(type => {
      if (type.includes('*')) {
        return file.type.startsWith(type.replace('*', ''));
      }
      return file.type === type;
    });
    
    if (!isValidType) {
      toast({
        title: "Invalid file type",
        description: `Please select a valid file type: ${docInfo.acceptedTypes.join(', ')}`,
        variant: "destructive"
      });
      return;
    }
    
    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > docInfo.maxSizeMB) {
      toast({
        title: "File too large",
        description: `File size must be less than ${docInfo.maxSizeMB}MB`,
        variant: "destructive"
      });
      return;
    }
    
    // Create preview URL for images
    if (file.type.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(file);
      setPreviewUrls(prev => ({ ...prev, [docType]: previewUrl }));
    }
    
    // Update selected files
    setSelectedFiles(prev => ({ ...prev, [docType]: file }));
    
    // Call parent handler
    onDocumentChange(docType, file);
    
    // Auto-upload the file
    uploadMutation.mutate({ docType, file });
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent, docType: string) => {
    e.preventDefault();
    setIsDragging(prev => ({ ...prev, [docType]: true }));
  };

  const handleDragLeave = (e: React.DragEvent, docType: string) => {
    e.preventDefault();
    setIsDragging(prev => ({ ...prev, [docType]: false }));
  };

  const handleDrop = (e: React.DragEvent, docType: string) => {
    e.preventDefault();
    setIsDragging(prev => ({ ...prev, [docType]: false }));
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(docType, files[0]);
    }
  };

  // View document
  const viewDocument = async (docType: string) => {
    const status = getDocumentStatus(docType);
    if (!status.url) {
      toast({
        title: "No document found",
        description: "Please upload a document first",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create a proper authenticated API endpoint for viewing documents
      let apiUrl = '';
      
      if (status.url.startsWith('/api/documents/')) {
        // This is an old API endpoint, use it directly  
        apiUrl = status.url;
      } else {
        // This is a filename, use the driver documents endpoint
        apiUrl = `/api/driver/documents/view/${status.url}`;
      }
      
      console.log('Fetching document at:', apiUrl);
      
      // Fetch document with authentication and open as blob
      const response = await fetch(apiUrl, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "Authentication Error",
            description: "Please login to view documents",
            variant: "destructive",
          });
          return;
        } else if (response.status === 404) {
          toast({
            title: "Document not found",
            description: "The document could not be found on the server",
            variant: "destructive",
          });
          return;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }
      
      // Get the document blob and create a URL for it
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      // Open in new window
      const newWindow = window.open(blobUrl, '_blank', 'width=800,height=600');
      
      // Clean up the blob URL after the window opens
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 5000);
      
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

  // Remove file
  const removeFile = (docType: string) => {
    setSelectedFiles(prev => ({ ...prev, [docType]: null }));
    setPreviewUrls(prev => ({ ...prev, [docType]: '' }));
    onDocumentChange(docType, null);
  };

  // Calculate overall progress
  const calculateProgress = () => {
    const requiredDocs = DOCUMENT_TYPES.filter(doc => doc.required);
    const uploadedCount = requiredDocs.filter(doc => {
      const status = getDocumentStatus(doc.id);
      return status.url || selectedFiles[doc.id];
    }).length;
    
    const verifiedCount = requiredDocs.filter(doc => {
      const status = getDocumentStatus(doc.id);
      return status.isVerified === true;
    }).length;
    
    return {
      uploaded: (uploadedCount / requiredDocs.length) * 100,
      verified: (verifiedCount / requiredDocs.length) * 100,
      uploadedCount,
      verifiedCount,
      totalCount: requiredDocs.length
    };
  };

  // Render document card
  const renderDocumentCard = (docInfo: DocumentInfo) => {
    const status = getDocumentStatus(docInfo.id);
    const selectedFile = selectedFiles[docInfo.id] || uploadedDocuments[docInfo.id];
    const progress = uploadProgress[docInfo.id] || 0;
    const isDraggingFile = isDragging[docInfo.id];
    const previewUrl = previewUrls[docInfo.id];

    return (
      <Card key={docInfo.id} className={cn("relative transition-all duration-200", {
        'border-primary': status.status === 'verified',
        'border-destructive': status.status === 'rejected',
        'border-yellow-500': status.status === 'pending',
        'border-dashed border-2 border-primary bg-primary/5': isDraggingFile,
      })}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {docInfo.title}
              {docInfo.required && <span className="text-destructive">*</span>}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {status.status === 'verified' && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
              {status.status === 'rejected' && (
                <Badge variant="outline" className="text-red-600 border-red-600">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Rejected
                </Badge>
              )}
              {status.status === 'pending' && (
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  <Clock className="w-3 h-3 mr-1" />
                  Pending
                </Badge>
              )}
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground">{docInfo.description}</p>
        </CardHeader>
        
        <CardContent className="pt-0">
          {/* Upload Progress */}
          {progress > 0 && progress < 100 && (
            <div className="mb-4">
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-muted-foreground mt-1">Uploading... {progress}%</p>
            </div>
          )}
          
          {/* Existing Document Display */}
          {status.url && !selectedFile && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {status.url.toLowerCase().includes('.pdf') ? (
                    <FileType className="w-4 h-4 text-red-500" />
                  ) : (
                    <FileImage className="w-4 h-4 text-blue-500" />
                  )}
                  <span className="text-sm font-medium">Current Document</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => viewDocument(docInfo.id)}
                    className="h-8 px-2"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRefs.current[docInfo.id]?.click()}
                    className="h-8 px-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* File Preview */}
          {(selectedFile || previewUrl) && (
            <div className="mb-4">
              {previewUrl && (
                <div className="relative">
                  <img 
                    src={previewUrl} 
                    alt="Document preview" 
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(docInfo.id)}
                    className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/80 hover:bg-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              
              {selectedFile && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>
          )}
          
          {/* Upload Area */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
              isDraggingFile 
                ? "border-primary bg-primary/5" 
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
            )}
            onDragOver={(e) => handleDragOver(e, docInfo.id)}
            onDragLeave={(e) => handleDragLeave(e, docInfo.id)}
            onDrop={(e) => handleDrop(e, docInfo.id)}
            onClick={() => fileInputRefs.current[docInfo.id]?.click()}
          >
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <div className="text-sm font-medium">
                {status.url ? 'Update Document' : 'Upload Document'}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatAcceptedTypes(docInfo.acceptedTypes)} (Max {docInfo.maxSizeMB}MB)
              </div>
            </div>
            
            <input
              type="file"
              ref={(el) => fileInputRefs.current[docInfo.id] = el}
              accept={docInfo.acceptedTypes.join(',')}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileSelect(docInfo.id, file);
                }
              }}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  const progress = calculateProgress();

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Document Upload Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{progress.uploadedCount}</div>
              <div className="text-sm text-muted-foreground">Uploaded</div>
              <Progress value={progress.uploaded} className="mt-2" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{progress.uploadedCount - progress.verifiedCount}</div>
              <div className="text-sm text-muted-foreground">Pending Review</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{progress.verifiedCount}</div>
              <div className="text-sm text-muted-foreground">Verified</div>
              <Progress value={progress.verified} className="mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Upload Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
          <TabsTrigger value="upload" className="text-xs sm:text-sm px-2 py-2 sm:px-4 sm:py-2 whitespace-nowrap overflow-hidden">
            <span className="hidden sm:inline">Upload Documents</span>
            <span className="sm:hidden">Upload</span>
          </TabsTrigger>
          <TabsTrigger value="status" className="text-xs sm:text-sm px-2 py-2 sm:px-4 sm:py-2 whitespace-nowrap overflow-hidden">
            <span className="hidden sm:inline">Document Status</span>
            <span className="sm:hidden">Status</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm px-2 py-2 sm:px-4 sm:py-2 whitespace-nowrap overflow-hidden">
            <span className="hidden sm:inline">Upload History</span>
            <span className="sm:hidden">History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {DOCUMENT_TYPES.map(docInfo => renderDocumentCard(docInfo))}
          </div>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <div className="grid gap-4">
            {DOCUMENT_TYPES.map(docInfo => {
              const status = getDocumentStatus(docInfo.id);
              return (
                <Card key={docInfo.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{docInfo.title}</h3>
                        <p className="text-sm text-muted-foreground">{docInfo.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {status.status === 'verified' && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                        {status.status === 'rejected' && (
                          <Badge variant="outline" className="text-red-600 border-red-600">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Rejected
                          </Badge>
                        )}
                        {status.status === 'pending' && (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                        {status.status === 'missing' && (
                          <Badge variant="outline" className="text-gray-600 border-gray-600">
                            Not Uploaded
                          </Badge>
                        )}
                        {status.url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewDocument(docInfo.id)}
                            className="h-8 px-2"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Upload history will show your document upload timeline and version history.
              This feature is coming soon.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CentralizedDocumentManager;
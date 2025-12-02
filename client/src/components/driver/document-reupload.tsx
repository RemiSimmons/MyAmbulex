import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileUpload } from "@/components/ui/file-upload";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { uploadDocument } from "@/utils/document-upload";
import { 
  AlertTriangle, 
  Upload, 
  CheckCircle, 
  FileCheck, 
  RefreshCw,
  ExternalLink
} from "lucide-react";

interface DocumentReuploadProps {
  documentType: string;
  documentTitle: string;
  currentUrl?: string;
  isRejected: boolean;
  rejectionReason?: string;
  isVerified?: boolean;
  onUploadSuccess?: (url: string) => void;
}

export function DocumentReupload({
  documentType,
  documentTitle,
  currentUrl,
  isRejected,
  rejectionReason,
  isVerified,
  onUploadSuccess
}: DocumentReuploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const getStatusBadge = () => {
    if (isVerified === true) {
      return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
    }
    if (isRejected === true) {
      return <Badge variant="destructive">Rejected</Badge>;
    }
    if (currentUrl) {
      return <Badge className="bg-yellow-100 text-yellow-800">Under Review</Badge>;
    }
    return <Badge variant="outline">Not Uploaded</Badge>;
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadedFile(file);

    try {
      const result = await uploadDocument(file, documentType);
      
      toast({
        title: "Document uploaded successfully",
        description: `${documentTitle} has been uploaded and is pending review.`,
      });

      // Force invalidate all relevant queries
      const { queryClient } = await import("@/lib/queryClient");
      await queryClient.invalidateQueries({ queryKey: ["/api/driver/details"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/driver/document-status"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/driver/documents"] });
      
      // Force refetch to ensure fresh data
      await queryClient.refetchQueries({ queryKey: ["/api/driver/details"] });

      if (onUploadSuccess) {
        onUploadSuccess(result.url);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className={isRejected ? "border-red-200 bg-red-50" : ""}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{documentTitle}</CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Rejection Reason Alert */}
        {isRejected && rejectionReason && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Document rejected:</p>
                <p className="text-sm">{rejectionReason}</p>
                <p className="text-sm font-medium">Please upload a new document addressing these issues.</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Current Document Display */}
        {currentUrl && !isRejected && (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2">
              <FileCheck className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium">Document uploaded</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(currentUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View
            </Button>
          </div>
        )}

        {/* File Upload Section */}
        <div className="space-y-3">
          {isRejected || !currentUrl ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {isRejected ? "Upload a new document:" : "Upload your document:"}
              </p>
              <FileUpload
                onFileSelect={handleFileUpload}
                acceptedTypes={{
                  'image/*': [],
                  'application/pdf': []
                }}
                maxSizeMB={10}
                disabled={isUploading}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400"
              >
                <div className="flex flex-col items-center space-y-2">
                  {isUploading ? (
                    <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
                  ) : (
                    <Upload className="h-8 w-8 text-gray-400" />
                  )}
                  <div className="text-sm">
                    <p className="font-medium">
                      {isUploading ? "Uploading..." : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-gray-500">PNG, JPG, or PDF (Max 10MB)</p>
                  </div>
                </div>
              </FileUpload>
            </div>
          ) : isVerified ? (
            <div className="flex items-center justify-center p-4 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-sm font-medium text-green-800">
                Document approved - no action needed
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span className="text-sm font-medium">Under review</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Trigger re-upload flow
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*,application/pdf';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      handleFileUpload(file);
                    }
                  };
                  input.click();
                }}
                disabled={isUploading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Replace
              </Button>
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {uploadedFile && isUploading && (
          <div className="text-sm text-gray-600 text-center">
            Uploading {uploadedFile.name}...
          </div>
        )}

        {/* Helper Text */}
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
          <p className="font-medium mb-1">Tips for best results:</p>
          <ul className="space-y-1 ml-2">
            <li>• Ensure document is clearly visible and well-lit</li>
            <li>• Check that all text is readable</li>
            <li>• Verify document is current and not expired</li>
            <li>• Upload the correct document type as requested</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
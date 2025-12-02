import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { EnhancedDocumentUpload } from '@/components/driver/enhanced-document-upload';
import { DocumentStatusBadge } from './document-status-badge';
import { DocumentRequirementsDisplay } from './document-requirements-display';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Eye, Download } from 'lucide-react';

interface DocumentUploadWithValidationProps {
  documentType: string;
  title: string;
  description?: string;
  required?: boolean;
  currentStatus?: 'pending' | 'approved' | 'rejected' | 'expired' | 'missing';
  currentFileUrl?: string;
  rejectionReason?: string;
  onStatusChange?: () => void;
}

export function DocumentUploadWithValidation({
  documentType,
  title,
  description,
  required = false,
  currentStatus = 'missing',
  currentFileUrl,
  rejectionReason,
  onStatusChange
}: DocumentUploadWithValidationProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showRequirements, setShowRequirements] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('documentType', documentType);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Upload Successful",
        description: "Your document has been uploaded and is being reviewed.",
      });
      setSelectedFile(null);
      onStatusChange?.();
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/driver/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/driver/document-status'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleFileSelect = useCallback((file: File | null) => {
    setSelectedFile(file);
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    await uploadMutation.mutateAsync(file);
  }, [uploadMutation]);

  const handleViewDocument = () => {
    if (currentFileUrl) {
      window.open(currentFileUrl, '_blank');
    }
  };

  const handleDownloadDocument = () => {
    if (currentFileUrl) {
      const link = document.createElement('a');
      link.href = currentFileUrl;
      link.download = `${title.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              {title}
              {required && <span className="text-destructive text-sm">*</span>}
            </CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <DocumentStatusBadge status={currentStatus} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Document Display */}
        {currentFileUrl && currentStatus !== 'missing' && (
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Current Document</p>
                <p className="text-sm text-muted-foreground">
                  {currentStatus === 'approved' && 'Verified and approved'}
                  {currentStatus === 'pending' && 'Under review by our team'}
                  {currentStatus === 'rejected' && 'Needs to be updated'}
                  {currentStatus === 'expired' && 'Document has expired'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewDocument}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadDocument}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>

            {/* Rejection Reason */}
            {currentStatus === 'rejected' && rejectionReason && (
              <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded">
                <p className="text-sm font-medium text-destructive">Attention Required</p>
                <p className="text-sm text-destructive/80 mt-1">{rejectionReason}</p>
              </div>
            )}
          </div>
        )}

        {/* Upload Section - Show if missing, rejected, or expired */}
        {(currentStatus === 'missing' || currentStatus === 'rejected' || currentStatus === 'expired') && (
          <>
            {/* Requirements Toggle */}
            <Collapsible open={showRequirements} onOpenChange={setShowRequirements}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                  <span className="text-sm font-medium">View Upload Requirements</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showRequirements ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <DocumentRequirementsDisplay documentType={documentType} compact />
              </CollapsibleContent>
            </Collapsible>

            {/* Upload Component */}
            <EnhancedDocumentUpload
              documentType={documentType}
              title={currentStatus === 'missing' ? 'Upload Document' : 'Upload New Document'}
              required={required}
              onFileSelect={handleFileSelect}
              onUpload={handleUpload}
              uploadProgress={uploadMutation.isPending ? 50 : 0}
              uploadStatus={
                uploadMutation.isPending ? 'uploading' : 
                uploadMutation.isSuccess ? 'success' : 
                uploadMutation.isError ? 'error' : 'idle'
              }
              errorMessage={uploadMutation.error?.message}
            />
          </>
        )}

        {/* Success Message for Approved Documents */}
        {currentStatus === 'approved' && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              ✓ This document has been verified and approved. No further action is needed.
            </p>
          </div>
        )}

        {/* Pending Message */}
        {currentStatus === 'pending' && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Your document is currently being reviewed. We'll notify you within 2-3 business days.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DocumentUploadWithValidation;
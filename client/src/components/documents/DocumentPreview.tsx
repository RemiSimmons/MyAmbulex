import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Download, AlertCircle, FileText, Image, FileX } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PreviewInfo {
  id: number;
  filename: string;
  mimeType: string;
  fileSize: number;
  isPreviewable: boolean;
  previewUrl: string | null;
  previewType: string;
  supportedTypes: string[];
}

interface DocumentPreviewProps {
  documentId: number;
  filename: string;
  onDownload?: () => void;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ documentId, filename, onDownload }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Fetch preview info
  const { data: previewData, isLoading, error } = useQuery({
    queryKey: ['document-preview-info', documentId],
    queryFn: async () => {
      const response = await fetch(`/api/documents/${documentId}/preview-info`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch preview info');
      }
      
      return response.json();
    },
    enabled: isOpen // Only fetch when dialog is opened
  });

  const previewInfo: PreviewInfo = previewData?.preview;

  const renderPreviewContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <div className="text-gray-500">Loading preview...</div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load preview. You can still download the document.
          </AlertDescription>
        </Alert>
      );
    }

    if (!previewInfo?.isPreviewable) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-center">
          <FileX className="h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">Preview Not Available</h3>
          <p className="text-gray-500 mb-4">
            This file type ({previewInfo?.mimeType}) cannot be previewed.
          </p>
          <div className="text-sm text-gray-400">
            Supported types: {previewInfo?.supportedTypes.join(', ')}
          </div>
        </div>
      );
    }

    // Render based on preview type
    switch (previewInfo.previewType) {
      case 'image':
        return (
          <div className="flex items-center justify-center max-h-96">
            <img 
              src={previewInfo.previewUrl!}
              alt={previewInfo.filename}
              className="max-w-full max-h-full object-contain rounded-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden text-center text-gray-500">
              <FileX className="h-16 w-16 mx-auto mb-2" />
              Failed to load image preview
            </div>
          </div>
        );

      case 'pdf':
        return (
          <div className="h-96">
            <iframe
              src={previewInfo.previewUrl!}
              className="w-full h-full border rounded-lg"
              title={`Preview of ${previewInfo.filename}`}
            />
          </div>
        );

      case 'text':
        return (
          <div className="h-96 overflow-auto">
            <iframe
              src={previewInfo.previewUrl!}
              className="w-full h-full border rounded-lg"
              title={`Preview of ${previewInfo.filename}`}
            />
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-96">
            <FileText className="h-16 w-16 text-gray-400 mb-4" />
            <p className="text-gray-500">Preview not supported for this file type</p>
          </div>
        );
    }
  };

  const getPreviewIcon = () => {
    if (!previewInfo) return <Eye className="h-4 w-4" />;
    
    switch (previewInfo.previewType) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      case 'text':
        return <FileText className="h-4 w-4" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getPreviewIcon()}
            {filename}
            {previewInfo && (
              <Badge variant="secondary">
                {previewInfo.previewType} • {formatFileSize(previewInfo.fileSize)}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          {renderPreviewContent()}
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-500">
            {previewInfo?.isPreviewable ? (
              <span className="text-green-600">✓ Preview available</span>
            ) : (
              <span className="text-orange-600">⚠ Preview not supported</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
            {onDownload && (
              <Button onClick={onDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentPreview;
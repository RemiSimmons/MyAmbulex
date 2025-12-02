import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Eye, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  FileText, 
  Image as ImageIcon,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedPreviewSystemProps {
  documentId: number;
  documentType: string;
  fileName?: string;
  fileSize?: number;
  uploadedAt?: string;
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  triggerClassName?: string;
  triggerText?: string;
}

interface DocumentMetadata {
  id: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  verificationStatus: string;
  rejectionReason?: string;
  isPreviewable: boolean;
  documentType: string;
}

export function EnhancedPreviewSystem({
  documentId,
  documentType,
  fileName,
  fileSize,
  uploadedAt,
  verificationStatus,
  rejectionReason,
  triggerClassName,
  triggerText = "Preview"
}: EnhancedPreviewSystemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  // Fetch document metadata
  const { data: metadata, isLoading: metadataLoading } = useQuery({
    queryKey: [`/api/documents/${documentId}/metadata`],
    enabled: isOpen
  });

  // Fetch document preview content
  const { data: previewData, isLoading: previewLoading, error } = useQuery({
    queryKey: [`/api/documents/${documentId}/preview`],
    enabled: isOpen && (metadata as any)?.isPreviewable,
    retry: false
  });

  const documentMetadata: DocumentMetadata = (metadata as DocumentMetadata) || {
    id: documentId,
    fileName: fileName || 'Unknown',
    fileSize: fileSize || 0,
    mimeType: 'application/octet-stream',
    uploadedAt: uploadedAt || new Date().toISOString(),
    verificationStatus: verificationStatus || 'pending',
    rejectionReason,
    isPreviewable: false,
    documentType
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(100);
    setRotation(0);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `/api/documents/${documentId}/download`;
    link.download = documentMetadata.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={triggerClassName}
        >
          <Eye className="h-4 w-4 mr-2" />
          {triggerText}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getFileIcon(documentMetadata.mimeType)}
              <span className="truncate">{documentMetadata.fileName}</span>
            </div>
            <Badge className={getStatusColor(documentMetadata.verificationStatus)}>
              {documentMetadata.verificationStatus === 'approved' && 'Verified'}
              {documentMetadata.verificationStatus === 'pending' && 'Under Review'}
              {documentMetadata.verificationStatus === 'rejected' && 'Needs Attention'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
          {/* Document Preview */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardContent className="p-4 h-full">
                {metadataLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Loading document...</span>
                  </div>
                ) : !(metadata as any)?.isPreviewable ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <FileText className="h-16 w-16 text-gray-400 mb-4" />
                    <p className="text-lg font-medium mb-2">Preview Not Available</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      This file type cannot be previewed in the browser
                    </p>
                    <Button onClick={handleDownload} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download to View
                    </Button>
                  </div>
                ) : previewLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Loading preview...</span>
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <AlertCircle className="h-16 w-16 text-red-400 mb-4" />
                    <p className="text-lg font-medium mb-2">Preview Error</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Unable to load document preview
                    </p>
                    <Button onClick={handleDownload} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download Instead
                    </Button>
                  </div>
                ) : (
                  <div className="h-full overflow-auto">
                    {/* Preview Controls */}
                    {documentMetadata.mimeType.startsWith('image/') && (
                      <div className="flex items-center justify-center space-x-2 mb-4 p-2 bg-gray-50 rounded">
                        <Button variant="ghost" size="sm" onClick={handleZoomOut}>
                          <ZoomOut className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium min-w-16 text-center">
                          {zoom}%
                        </span>
                        <Button variant="ghost" size="sm" onClick={handleZoomIn}>
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleRotate}>
                          <RotateCw className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleReset}>
                          Reset
                        </Button>
                      </div>
                    )}

                    {/* Image Preview */}
                    {documentMetadata.mimeType.startsWith('image/') && previewData && (
                      <div className="flex justify-center">
                        <img
                          src={`/api/documents/${documentId}/preview`}
                          alt="Document preview"
                          style={{
                            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                            transition: 'transform 0.2s ease-in-out',
                            maxWidth: '100%',
                            height: 'auto'
                          }}
                          className="border rounded"
                        />
                      </div>
                    )}

                    {/* PDF Preview */}
                    {documentMetadata.mimeType === 'application/pdf' && (
                      <iframe
                        src={`/api/documents/${documentId}/preview`}
                        className="w-full h-96 border rounded"
                        title="PDF Preview"
                      />
                    )}

                    {/* Text Preview */}
                    {documentMetadata.mimeType.startsWith('text/') && typeof previewData === 'string' && (
                      <pre className="whitespace-pre-wrap text-sm p-4 bg-gray-50 rounded overflow-auto max-h-96">
                        {previewData}
                      </pre>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Document Information */}
          <div className="space-y-4">
            {/* Document Details */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-medium">Document Details</h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="capitalize">{documentMetadata.documentType.replace('_', ' ')}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Size:</span>
                    <span>{formatFileSize(documentMetadata.fileSize)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Uploaded:</span>
                    <span>{new Date(documentMetadata.uploadedAt).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Format:</span>
                    <span>{documentMetadata.mimeType.split('/')[1].toUpperCase()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Verification Status */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-medium">Verification Status</h3>
                
                <div className="space-y-2">
                  <Badge className={cn("w-full justify-center", getStatusColor(documentMetadata.verificationStatus))}>
                    {documentMetadata.verificationStatus === 'approved' && 'Document Verified'}
                    {documentMetadata.verificationStatus === 'pending' && 'Under Review'}
                    {documentMetadata.verificationStatus === 'rejected' && 'Needs Attention'}
                  </Badge>
                  
                  {documentMetadata.verificationStatus === 'approved' && (
                    <p className="text-sm text-green-700">
                      This document has been verified and meets all requirements.
                    </p>
                  )}
                  
                  {documentMetadata.verificationStatus === 'pending' && (
                    <p className="text-sm text-yellow-700">
                      Your document is being reviewed. We'll notify you within 2-3 business days.
                    </p>
                  )}
                  
                  {documentMetadata.verificationStatus === 'rejected' && documentMetadata.rejectionReason && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {documentMetadata.rejectionReason}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <h3 className="font-medium mb-3">Actions</h3>
                
                <Button onClick={handleDownload} className="w-full" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Document
                </Button>
                
                <Button 
                  onClick={() => setIsOpen(false)} 
                  className="w-full"
                  variant="secondary"
                >
                  Close Preview
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EnhancedPreviewSystem;
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Download, FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import DocumentPreview from './DocumentPreview';

interface Document {
  id: number;
  filename: string;
  type: string;
  uploadedAt: string;
  verificationStatus: string;
  fileSize: number;
  downloadUrl: string;
}

interface DocumentListResponse {
  documents: Document[];
  total: number;
  hasAdvancedFeatures: boolean;
}

const BasicDocumentList: React.FC = () => {
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [downloadingIds, setDownloadingIds] = useState<Set<number>>(new Set());

  // Fetch user documents with basic filtering
  const { data, isLoading, error, refetch } = useQuery<DocumentListResponse>({
    queryKey: ['my-documents', typeFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter) params.append('type', typeFilter);
      if (statusFilter) params.append('status', statusFilter);
      
      const response = await fetch(`/api/documents/my-documents?${params}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      
      return response.json();
    }
  });

  const handleDownload = async (document: Document) => {
    try {
      setDownloadingIds(prev => new Set(prev).add(document.id));
      
      const response = await fetch(document.downloadUrl, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Download failed');
      }
      
      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.filename;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Download failed:', error);
      alert(error instanceof Error ? error.message : 'Download failed');
    } finally {
      setDownloadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(document.id);
        return newSet;
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading documents...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load documents. Please try again.
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-2"
                onClick={() => refetch()}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Documents</CardTitle>
        {data && !data.hasAdvancedFeatures && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Basic download features only. No bulk download or advanced search available.
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent>
        {/* Basic Filtering */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="license">License</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
                <SelectItem value="vehicle_registration">Vehicle Registration</SelectItem>
                <SelectItem value="medical_certification">Medical Certification</SelectItem>
                <SelectItem value="background_check">Background Check</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Document List */}
        {data?.documents?.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No documents found. Upload some documents to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {data?.documents?.map((doc) => (
              <div 
                key={doc.id} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(doc.verificationStatus)}
                    <FileText className="h-5 w-5 text-gray-400" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="font-medium">{doc.filename}</div>
                    <div className="text-sm text-gray-500">
                      {doc.type.replace('_', ' ').toUpperCase()} • {formatFileSize(doc.fileSize)} • {formatDate(doc.uploadedAt)}
                    </div>
                  </div>
                  
                  <Badge className={getStatusColor(doc.verificationStatus)}>
                    {doc.verificationStatus}
                  </Badge>
                </div>
                
                <div className="flex gap-2 ml-4">
                  <DocumentPreview 
                    documentId={doc.id}
                    filename={doc.filename}
                    onDownload={() => handleDownload(doc)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(doc)}
                    disabled={downloadingIds.has(doc.id)}
                  >
                    {downloadingIds.has(doc.id) ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full mr-2" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Info */}
        {data && data.total > 0 && (
          <div className="mt-6 text-sm text-gray-500 text-center">
            Showing {data.documents.length} of {data.total} documents
            <br />
            Download limit: 10 files per hour
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BasicDocumentList;
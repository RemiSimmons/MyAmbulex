import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DocumentStatusBadge } from './document-status-badge';
import { SmartUploadComponent } from './smart-upload-component';
import { EnhancedPreviewSystem } from './enhanced-preview-system';
import { 
  ChevronDown, 
  Upload, 
  Eye, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Camera,
  FileText,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileDocumentCardProps {
  document: {
    id: number;
    type: string;
    title: string;
    status: 'pending' | 'approved' | 'rejected' | 'expired' | 'missing';
    uploadedAt?: string;
    rejectionReason?: string;
    required: boolean;
    fileUrl?: string;
  };
  onUploadSuccess?: () => void;
}

export function MobileDocumentCard({ document, onUploadSuccess }: MobileDocumentCardProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const getStatusIcon = () => {
    switch (document.status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'rejected': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'missing': return <Upload className="h-4 w-4 text-gray-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusMessage = () => {
    switch (document.status) {
      case 'approved': return 'Document verified and approved';
      case 'pending': return 'Under review by our team';
      case 'rejected': return document.rejectionReason || 'Document needs to be updated';
      case 'missing': return 'Required document not uploaded';
      default: return 'Status unknown';
    }
  };

  const needsAction = document.status === 'missing' || document.status === 'rejected';

  return (
    <Card className={cn(
      "w-full",
      needsAction && "border-orange-200 bg-orange-50/50"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              {getStatusIcon()}
              <span className="truncate">{document.title}</span>
              {document.required && (
                <Badge variant="outline" className="text-xs">Required</Badge>
              )}
            </CardTitle>
          </div>
          <DocumentStatusBadge status={document.status} size="sm" />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Status Message */}
        <p className="text-sm text-muted-foreground">
          {getStatusMessage()}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {document.fileUrl && (
            <>
              <EnhancedPreviewSystem
                documentId={document.id}
                documentType={document.type}
                verificationStatus={document.status as 'pending' | 'approved' | 'rejected'}
                rejectionReason={document.rejectionReason}
                triggerClassName="flex-1 min-w-0"
                triggerText="View"
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(document.fileUrl, '_blank')}
                className="flex-1 min-w-0"
              >
                <FileText className="h-4 w-4 mr-1" />
                Download
              </Button>
            </>
          )}
          
          {needsAction && (
            <Sheet open={showUpload} onOpenChange={setShowUpload}>
              <SheetTrigger asChild>
                <Button className="flex-1 min-w-0">
                  <Upload className="h-4 w-4 mr-2" />
                  {document.status === 'missing' ? 'Upload' : 'Replace'}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[90vh]">
                <SheetHeader>
                  <SheetTitle>Upload {document.title}</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <SmartUploadComponent
                    documentType={document.type}
                    title={document.title}
                    onSuccess={() => {
                      setShowUpload(false);
                      onUploadSuccess?.();
                    }}
                  />
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>

        {/* Expandable Details */}
        {(document.rejectionReason || document.uploadedAt) && (
          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between p-0 h-auto">
                <span className="text-sm">Details</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", showDetails && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {document.uploadedAt && (
                <div className="text-xs text-muted-foreground">
                  Uploaded: {new Date(document.uploadedAt).toLocaleDateString()}
                </div>
              )}
              {document.rejectionReason && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  <strong>Attention Required:</strong> {document.rejectionReason}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

interface MobileDocumentDashboardProps {
  documents: Array<{
    id: number;
    type: string;
    title: string;
    status: 'pending' | 'approved' | 'rejected' | 'expired' | 'missing';
    uploadedAt?: string;
    rejectionReason?: string;
    required: boolean;
    fileUrl?: string;
  }>;
  overallProgress?: number;
  onRefresh?: () => void;
}

export function MobileDocumentDashboard({ 
  documents = [], 
  overallProgress = 0,
  onRefresh 
}: MobileDocumentDashboardProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'missing' | 'approved'>('all');

  const statusCounts = {
    approved: documents.filter(d => d.status === 'approved').length,
    pending: documents.filter(d => d.status === 'pending').length,
    missing: documents.filter(d => d.status === 'missing').length,
    rejected: documents.filter(d => d.status === 'rejected').length,
    total: documents.length
  };

  const filteredDocuments = documents.filter(doc => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'missing') return doc.status === 'missing' || doc.status === 'rejected';
    return doc.status === activeFilter;
  });

  const filterButtons = [
    { key: 'all', label: 'All', count: statusCounts.total },
    { key: 'missing', label: 'Action Needed', count: statusCounts.missing + statusCounts.rejected },
    { key: 'pending', label: 'Under Review', count: statusCounts.pending },
    { key: 'approved', label: 'Verified', count: statusCounts.approved }
  ];

  return (
    <div className="space-y-4">
      {/* Progress Overview */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Document Verification</h3>
              <Badge variant="outline">
                {statusCounts.approved}/{statusCounts.total} Complete
              </Badge>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Progress</span>
                <span>{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="flex flex-col items-center p-2 bg-green-50 rounded">
                <CheckCircle className="h-4 w-4 text-green-600 mb-1" />
                <span className="font-semibold text-green-700">{statusCounts.approved}</span>
                <span className="text-green-600">Verified</span>
              </div>
              <div className="flex flex-col items-center p-2 bg-yellow-50 rounded">
                <Clock className="h-4 w-4 text-yellow-600 mb-1" />
                <span className="font-semibold text-yellow-700">{statusCounts.pending}</span>
                <span className="text-yellow-600">Under Review</span>
              </div>
              <div className="flex flex-col items-center p-2 bg-orange-50 rounded">
                <AlertCircle className="h-4 w-4 text-orange-600 mb-1" />
                <span className="font-semibold text-orange-700">{statusCounts.missing + statusCounts.rejected}</span>
                <span className="text-orange-600">Action Needed</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {filterButtons.map(filter => (
          <Button
            key={filter.key}
            variant={activeFilter === filter.key ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveFilter(filter.key as any)}
            className={cn(
              "flex-shrink-0 text-xs",
              activeFilter === filter.key && "bg-white shadow-sm"
            )}
          >
            {filter.label}
            {filter.count > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1">
                {filter.count}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Document List */}
      <div className="space-y-3">
        {filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {activeFilter === 'all' ? 'No documents found' : `No ${activeFilter} documents`}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredDocuments.map(document => (
            <MobileDocumentCard
              key={document.id}
              document={document}
              onUploadSuccess={onRefresh}
            />
          ))
        )}
      </div>

      {/* Quick Camera Upload Button */}
      <div className="fixed bottom-6 right-6 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="lg" className="rounded-full h-14 w-14 shadow-lg">
              <Camera className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[90vh]">
            <SheetHeader>
              <SheetTitle>Quick Document Upload</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              {documents.filter(d => d.status === 'missing' || d.status === 'rejected').map(doc => (
                <Card key={doc.id} className="cursor-pointer hover:bg-gray-50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.status === 'missing' ? 'Required document' : 'Needs replacement'}
                        </p>
                      </div>
                      <DocumentStatusBadge status={doc.status} size="sm" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

export default MobileDocumentDashboard;
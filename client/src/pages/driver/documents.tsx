import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DocumentReuploadSystem from '@/components/driver/document-reupload-system';
import { FileText } from 'lucide-react';

export default function DriverDocumentsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center space-x-3">
          <FileText className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">Document Management</h1>
            <p className="text-muted-foreground">
              Upload and manage your verification documents for compliance
            </p>
          </div>
        </div>
        
        <DocumentReuploadSystem />
      </div>
    </div>
  );
}
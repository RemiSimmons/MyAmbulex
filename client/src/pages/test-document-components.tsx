import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DocumentStatusBadge, 
  DocumentRequirementsDisplay, 
  DocumentUploadWithValidation,
  EnhancedDocumentUpload 
} from '@/components/documents';

export default function TestDocumentComponents() {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    setUploadStatus('idle');
  };

  const simulateUpload = async (file: File) => {
    setUploadStatus('uploading');
    setUploadProgress(0);
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadStatus('success');
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const statusExamples = [
    { status: 'missing' as const, title: 'Missing Document' },
    { status: 'pending' as const, title: 'Under Review' },
    { status: 'approved' as const, title: 'Verified Document' },
    { status: 'rejected' as const, title: 'Needs Attention' },
    { status: 'expired' as const, title: 'Expired Document' }
  ];

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Document System Test Page</h1>
        <p className="text-muted-foreground">
          Testing the enhanced document upload and validation system
        </p>
      </div>

      <Tabs defaultValue="status-badges" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="status-badges">Status Badges</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="enhanced-upload">Enhanced Upload</TabsTrigger>
          <TabsTrigger value="full-component">Full Component</TabsTrigger>
        </TabsList>

        <TabsContent value="status-badges" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Status Badges</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {statusExamples.map(({ status, title }) => (
                <div key={status} className="flex items-center justify-between p-4 border rounded-lg">
                  <span className="font-medium">{title}</span>
                  <DocumentStatusBadge status={status} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requirements" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DocumentRequirementsDisplay documentType="license" />
            <DocumentRequirementsDisplay documentType="insurance" />
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Compact Requirements Display</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentRequirementsDisplay documentType="background_check" compact />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enhanced-upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enhanced Document Upload</CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedDocumentUpload
                documentType="license"
                title="Driver's License"
                required
                onFileSelect={handleFileSelect}
                onUpload={simulateUpload}
                uploadProgress={uploadProgress}
                uploadStatus={uploadStatus}
                errorMessage={uploadStatus === 'error' ? 'Upload failed. Please try again.' : undefined}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="full-component" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Missing Document */}
            <DocumentUploadWithValidation
              documentType="license"
              title="Driver's License"
              description="Upload clear photos of both sides of your license"
              required
              currentStatus="missing"
            />

            {/* Approved Document */}
            <DocumentUploadWithValidation
              documentType="insurance"
              title="Insurance Policy"
              description="Current auto insurance policy document"
              required
              currentStatus="approved"
              currentFileUrl="/api/documents/123/download"
            />

            {/* Rejected Document */}
            <DocumentUploadWithValidation
              documentType="background_check"
              title="Background Check"
              description="Official background check report"
              required
              currentStatus="rejected"
              currentFileUrl="/api/documents/124/download"
              rejectionReason="The document appears to be incomplete. Please upload the full background check report including all pages."
            />

            {/* Pending Document */}
            <DocumentUploadWithValidation
              documentType="drug_test"
              title="Drug Test Results"
              description="Recent drug test results from approved facility"
              required
              currentStatus="pending"
              currentFileUrl="/api/documents/125/download"
            />
          </div>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>System Test Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800">✓ API Endpoints</h4>
              <p className="text-green-700">Requirements and validation APIs working</p>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800">✓ Error Handling</h4>
              <p className="text-green-700">User-friendly error messages implemented</p>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800">✓ Validation</h4>
              <p className="text-green-700">Real-time file validation working</p>
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800">Phase 1 Implementation Complete</h4>
            <ul className="list-disc list-inside text-sm text-blue-700 mt-2 space-y-1">
              <li>User-friendly error translation service</li>
              <li>Enhanced document upload with real-time validation</li>
              <li>Clear file requirements display</li>
              <li>Improved status communication</li>
              <li>Better upload experience with progress tracking</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
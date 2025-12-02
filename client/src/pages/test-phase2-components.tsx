import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';


import { DocumentStatusDashboard } from '@/components/documents/document-status-dashboard';
import { SmartUploadComponent } from '@/components/documents/smart-upload-component';
import { EnhancedPreviewSystem } from '@/components/documents/enhanced-preview-system';
import { MobileDocumentDashboard, MobileDocumentCard } from '@/components/documents/mobile-optimized-components';
import { DocumentStatusBadge } from '@/components/documents/document-status-badge';
import { 
  Smartphone, 
  Monitor, 
  Tablet, 
  FileText, 
  Upload, 
  Eye,
  LayoutDashboard,
  Zap,
  Star,
  Layers
} from 'lucide-react';

// Mock data for testing Phase 2 components
const mockDocuments = [
  {
    id: 1,
    type: 'drivers_license',
    title: "Driver's License",
    status: 'approved' as const,
    uploadedAt: '2025-08-10T10:30:00Z',
    required: true,
    fileUrl: '/api/documents/1/download'
  },
  {
    id: 2,
    type: 'vehicle_registration',
    title: 'Vehicle Registration',
    status: 'pending' as const,
    uploadedAt: '2025-08-12T14:20:00Z',
    required: true,
    fileUrl: '/api/documents/2/download'
  },
  {
    id: 3,
    type: 'insurance_card',
    title: 'Insurance Card',
    status: 'rejected' as const,
    uploadedAt: '2025-08-11T09:15:00Z',
    rejectionReason: 'Document appears blurry and text is not clearly readable. Please upload a higher quality image.',
    required: true,
    fileUrl: '/api/documents/3/download'
  },
  {
    id: 4,
    type: 'background_check',
    title: 'Background Check',
    status: 'missing' as const,
    required: true
  },
  {
    id: 5,
    type: 'medical_clearance',
    title: 'Medical Clearance',
    status: 'expired' as const,
    uploadedAt: '2025-07-01T12:00:00Z',
    required: true,
    fileUrl: '/api/documents/5/download'
  }
];

const mockDashboardData = {
  documents: mockDocuments,
  overallProgress: 60,
  requiredCount: 5,
  completedCount: 1,
  pendingCount: 1,
  rejectedCount: 2
};

export default function TestPhase2Components() {
  const [activeView, setActiveView] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [selectedComponent, setSelectedComponent] = useState<'dashboard' | 'upload' | 'preview' | 'mobile'>('dashboard');

  const getViewportClass = () => {
    switch (activeView) {
      case 'mobile': return 'max-w-sm mx-auto border rounded-lg overflow-hidden';
      case 'tablet': return 'max-w-2xl mx-auto border rounded-lg overflow-hidden';
      case 'desktop': return 'w-full';
      default: return 'w-full';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-6 w-6 text-blue-600" />
                  Phase 2: Enhanced UX Components Testing
                </CardTitle>
                <p className="text-muted-foreground mt-1">
                  Document status dashboard, smart upload, enhanced preview, and mobile optimization
                </p>
              </div>
              <Badge variant="outline" className="text-green-600">
                <Star className="h-3 w-3 mr-1" />
                Phase 2 Ready
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Component Navigation */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant={selectedComponent === 'dashboard' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedComponent('dashboard')}
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Status Dashboard
              </Button>
              <Button
                variant={selectedComponent === 'upload' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedComponent('upload')}
              >
                <Upload className="h-4 w-4 mr-2" />
                Smart Upload
              </Button>
              <Button
                variant={selectedComponent === 'preview' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedComponent('preview')}
              >
                <Eye className="h-4 w-4 mr-2" />
                Enhanced Preview
              </Button>
              <Button
                variant={selectedComponent === 'mobile' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedComponent('mobile')}
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Mobile Optimized
              </Button>
            </div>

            {/* Viewport Selection */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Viewport:</span>
              <Button
                variant={activeView === 'desktop' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('desktop')}
              >
                <Monitor className="h-4 w-4 mr-1" />
                Desktop
              </Button>
              <Button
                variant={activeView === 'tablet' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('tablet')}
              >
                <Tablet className="h-4 w-4 mr-1" />
                Tablet
              </Button>
              <Button
                variant={activeView === 'mobile' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('mobile')}
              >
                <Smartphone className="h-4 w-4 mr-1" />
                Mobile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Component Display Area */}
        <div className={getViewportClass()}>
          <div className="bg-white min-h-96">
            {selectedComponent === 'dashboard' && (
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <LayoutDashboard className="h-5 w-5 text-blue-600" />
                  Document Status Dashboard
                </h3>
                {activeView === 'mobile' ? (
                  <MobileDocumentDashboard
                    documents={mockDocuments}
                    overallProgress={mockDashboardData.overallProgress}
                    onRefresh={() => console.log('Refresh triggered')}
                  />
                ) : (
                  <DocumentStatusDashboard
                    userId={1}
                    userRole="driver"
                    compact={activeView === 'tablet'}
                  />
                )}
              </div>
            )}

            {selectedComponent === 'upload' && (
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-green-600" />
                  Smart Upload Component
                </h3>
                <SmartUploadComponent
                  documentType="drivers_license"
                  title="Driver's License Upload"
                  description="Upload a clear photo of your driver's license"
                  onSuccess={(data) => console.log('Upload success:', data)}
                  onError={(error) => console.log('Upload error:', error)}
                />
              </div>
            )}

            {selectedComponent === 'preview' && (
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-purple-600" />
                  Enhanced Preview System
                </h3>
                <div className="space-y-4">
                  {mockDocuments.filter(doc => doc.fileUrl).map((doc) => (
                    <Card key={doc.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-gray-500" />
                            <div>
                              <p className="font-medium">{doc.title}</p>
                              <p className="text-sm text-muted-foreground">
                                Uploaded {new Date(doc.uploadedAt!).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <DocumentStatusBadge status={doc.status} />
                            <EnhancedPreviewSystem
                              documentId={doc.id}
                              documentType={doc.type}
                              fileName={`${doc.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`}
                              fileSize={2048000}
                              uploadedAt={doc.uploadedAt}
                              verificationStatus={doc.status as 'pending' | 'approved' | 'rejected'}
                              rejectionReason={doc.rejectionReason}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {selectedComponent === 'mobile' && (
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-orange-600" />
                  Mobile Optimized Components
                </h3>
                <div className="space-y-4">
                  <div className="mb-4">
                    <Badge variant="outline" className="mb-2">
                      Individual Mobile Cards
                    </Badge>
                    {mockDocuments.slice(0, 3).map((doc) => (
                      <div key={doc.id} className="mb-3">
                        <MobileDocumentCard
                          document={doc}
                          onUploadSuccess={() => console.log('Upload success for:', doc.title)}
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <Badge variant="outline" className="mb-2">
                      Full Mobile Dashboard
                    </Badge>
                    <MobileDocumentDashboard
                      documents={mockDocuments}
                      overallProgress={mockDashboardData.overallProgress}
                      onRefresh={() => console.log('Mobile dashboard refresh')}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <LayoutDashboard className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h4 className="font-semibold">Status Dashboard</h4>
              <p className="text-sm text-muted-foreground">
                Comprehensive document overview with progress tracking
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Zap className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h4 className="font-semibold">Smart Upload</h4>
              <p className="text-sm text-muted-foreground">
                Real-time validation with drag & drop support
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Eye className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <h4 className="font-semibold">Enhanced Preview</h4>
              <p className="text-sm text-muted-foreground">
                Inline document viewing with zoom and controls
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Smartphone className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <h4 className="font-semibold">Mobile Optimized</h4>
              <p className="text-sm text-muted-foreground">
                Touch-friendly interface with sheet modals
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Technical Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Phase 2 Implementation Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-green-700 mb-2">✓ Completed Features</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Document status dashboard with progress tracking</li>
                  <li>• Smart upload with real-time validation</li>
                  <li>• Enhanced preview with zoom/rotate controls</li>
                  <li>• Mobile-optimized components and layouts</li>
                  <li>• Responsive design across all viewports</li>
                  <li>• Interactive status badges and indicators</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-blue-700 mb-2">🔧 Technical Enhancements</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• TypeScript integration with proper typing</li>
                  <li>• Optimized component architecture</li>
                  <li>• Accessible UI with proper ARIA labels</li>
                  <li>• Performance-optimized with React Query</li>
                  <li>• Mobile-first responsive design principles</li>
                  <li>• Comprehensive error handling</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap,
  LayoutDashboard,
  FileText,
  Clock,
  Star,
  Smartphone,
  Monitor,
  Tablet
} from 'lucide-react';
import { BulkDocumentOperations } from '@/components/admin/bulk-document-operations';
import { ExpirationDashboard } from '@/components/admin/expiration-dashboard';

export default function TestPhase3Components() {
  const [selectedComponent, setSelectedComponent] = useState('expiration');
  const [activeView, setActiveView] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const getViewportClasses = () => {
    switch (activeView) {
      case 'mobile':
        return 'w-full max-w-sm mx-auto';
      case 'tablet':
        return 'w-full max-w-2xl mx-auto';
      default:
        return 'w-full';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-3">
                  <Zap className="h-8 w-8 text-blue-600" />
                  Phase 3: Simplified Advanced Features
                </CardTitle>
                <p className="text-muted-foreground mt-2">
                  Document expiration management and admin bulk operations for enhanced efficiency
                </p>
              </div>
              <Badge className="bg-green-100 text-green-800">
                High Business Impact
              </Badge>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Viewport Controls */}
      <div className="max-w-7xl mx-auto mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-medium">Test Viewport:</span>
              <div className="flex gap-2">
                <Button
                  variant={activeView === 'desktop' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveView('desktop')}
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  Desktop
                </Button>
                <Button
                  variant={activeView === 'tablet' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveView('tablet')}
                >
                  <Tablet className="h-4 w-4 mr-2" />
                  Tablet
                </Button>
                <Button
                  variant={activeView === 'mobile' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveView('mobile')}
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  Mobile
                </Button>
              </div>

              <div className="flex gap-2 ml-auto">
                <Button
                  variant={selectedComponent === 'expiration' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedComponent('expiration')}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Expiration Dashboard
                </Button>
                <Button
                  variant={selectedComponent === 'bulk' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedComponent('bulk')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Bulk Operations
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Component Display */}
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {selectedComponent === 'expiration' ? (
                <>
                  <Clock className="h-5 w-5 text-blue-600" />
                  Document Expiration Management
                </>
              ) : (
                <>
                  <FileText className="h-5 w-5 text-blue-600" />
                  Admin Bulk Operations
                </>
              )}
            </CardTitle>
            <p className="text-muted-foreground">
              {selectedComponent === 'expiration' 
                ? 'Automated tracking and proactive renewal management for compliance'
                : 'Efficient multi-document processing for admin workflow optimization'
              }
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <div className={getViewportClasses()}>
              {selectedComponent === 'expiration' ? (
                <ExpirationDashboard />
              ) : (
                <BulkDocumentOperations />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features Overview */}
      <div className="max-w-7xl mx-auto mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <Clock className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Document Expiration Management</h3>
                <p className="text-muted-foreground mb-4">
                  Proactive compliance monitoring with automated renewal tracking
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Real-time expiration monitoring</span>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <Star className="h-3 w-3 mr-1" />
                      Critical
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Automated renewal reminders</span>
                    <Badge variant="outline" className="text-blue-600 border-blue-600">
                      <Star className="h-3 w-3 mr-1" />
                      High Impact
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Compliance dashboard</span>
                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                      <Star className="h-3 w-3 mr-1" />
                      Business Value
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Admin Bulk Operations</h3>
                <p className="text-muted-foreground mb-4">
                  Efficient multi-document processing for scaling admin workflows
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Bulk approve/reject actions</span>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <Star className="h-3 w-3 mr-1" />
                      Time Saver
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Multi-select interface</span>
                    <Badge variant="outline" className="text-blue-600 border-blue-600">
                      <Star className="h-3 w-3 mr-1" />
                      UX Enhanced
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Batch notifications</span>
                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                      <Star className="h-3 w-3 mr-1" />
                      Automated
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Phase 3 Summary */}
      <div className="max-w-7xl mx-auto mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Simplified Phase 3 Implementation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium text-green-600">✅ Implemented</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Document expiration dashboard</li>
                  <li>• Bulk operations interface</li>
                  <li>• Multi-viewport testing</li>
                  <li>• Integration with existing admin system</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-blue-600">🔄 Business Impact</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Prevents compliance violations</li>
                  <li>• Saves admin processing time</li>
                  <li>• Scales with driver growth</li>
                  <li>• Reduces manual oversight</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-orange-600">⏳ Ready for Storage Integration</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Expiration tracking queries</li>
                  <li>• Automated notification system</li>
                  <li>• Background service deployment</li>
                  <li>• Real data integration</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
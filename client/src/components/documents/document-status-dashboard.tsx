import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DocumentStatusBadge } from './document-status-badge';
import { CheckCircle, Clock, AlertCircle, Upload, Eye, Download } from 'lucide-react';

interface DocumentStatusDashboardProps {
  userId?: number;
  userRole?: 'driver' | 'rider' | 'admin';
  compact?: boolean;
}

interface DocumentStatus {
  id: number;
  type: string;
  title: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'missing';
  uploadedAt?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  required: boolean;
  fileUrl?: string;
}

interface DashboardData {
  documents: DocumentStatus[];
  overallProgress: number;
  requiredCount: number;
  completedCount: number;
  pendingCount: number;
  rejectedCount: number;
}

export function DocumentStatusDashboard({ 
  userId, 
  userRole = 'driver',
  compact = false 
}: DocumentStatusDashboardProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/documents/dashboard`, userId],
    enabled: !!userId
  });

  const dashboardData: DashboardData = (data as DashboardData) || {
    documents: [],
    overallProgress: 0,
    requiredCount: 0,
    completedCount: 0,
    pendingCount: 0,
    rejectedCount: 0
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-destructive">
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Unable to load document status</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'rejected': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'missing': return <Upload className="h-4 w-4 text-gray-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (compact) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Document Verification</CardTitle>
            <Badge variant="outline">
              {dashboardData.completedCount}/{dashboardData.requiredCount} Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Overall Progress</span>
                <span>{dashboardData.overallProgress}%</span>
              </div>
              <Progress 
                value={dashboardData.overallProgress} 
                className="h-2"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="text-green-600">
                <div className="font-semibold">{dashboardData.completedCount}</div>
                <div className="text-xs">Verified</div>
              </div>
              <div className="text-yellow-600">
                <div className="font-semibold">{dashboardData.pendingCount}</div>
                <div className="text-xs">Under Review</div>
              </div>
              <div className="text-red-600">
                <div className="font-semibold">{dashboardData.rejectedCount}</div>
                <div className="text-xs">Need Attention</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Document Verification Status
            <Badge variant={dashboardData.overallProgress === 100 ? "default" : "secondary"}>
              {dashboardData.completedCount}/{dashboardData.requiredCount} Complete
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Overall Progress</span>
              <span className="font-semibold">{dashboardData.overallProgress}%</span>
            </div>
            <Progress 
              value={dashboardData.overallProgress} 
              className="h-3"
            />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
              <div className="text-lg font-semibold text-green-700">{dashboardData.completedCount}</div>
              <div className="text-sm text-green-600">Verified</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-1" />
              <div className="text-lg font-semibold text-yellow-700">{dashboardData.pendingCount}</div>
              <div className="text-sm text-yellow-600">Under Review</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600 mx-auto mb-1" />
              <div className="text-lg font-semibold text-red-700">{dashboardData.rejectedCount}</div>
              <div className="text-sm text-red-600">Need Attention</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Upload className="h-6 w-6 text-gray-600 mx-auto mb-1" />
              <div className="text-lg font-semibold text-gray-700">
                {dashboardData.requiredCount - dashboardData.completedCount - dashboardData.pendingCount}
              </div>
              <div className="text-sm text-gray-600">Missing</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document List */}
      <Card>
        <CardHeader>
          <CardTitle>Document Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dashboardData.documents.map((doc) => (
              <div 
                key={doc.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  {getStatusIcon(doc.status)}
                  <div>
                    <div className="font-medium">{doc.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {doc.status === 'approved' && doc.verifiedAt && 
                        `Verified ${new Date(doc.verifiedAt).toLocaleDateString()}`
                      }
                      {doc.status === 'pending' && doc.uploadedAt && 
                        `Uploaded ${new Date(doc.uploadedAt).toLocaleDateString()}`
                      }
                      {doc.status === 'rejected' && doc.rejectionReason && 
                        doc.rejectionReason
                      }
                      {doc.status === 'missing' && 'Required document not uploaded'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <DocumentStatusBadge status={doc.status} size="sm" />
                  
                  {doc.fileUrl && (
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DocumentStatusDashboard;
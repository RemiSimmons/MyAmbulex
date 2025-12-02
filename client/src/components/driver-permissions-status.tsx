import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Clock, AlertTriangle, Mail, Shield, FileCheck, Car } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface DriverPermissionsStatusProps {
  userId?: number;
  showActions?: boolean;
}

export function DriverPermissionsStatus({ userId, showActions = true }: DriverPermissionsStatusProps) {
  const { data: permissions, isLoading, refetch } = useQuery({
    queryKey: ['/api/driver/permissions'],
    queryFn: () => apiRequest('GET', '/api/driver/permissions').then(res => res.json()),
  });

  const { data: summary } = useQuery({
    queryKey: ['/api/driver/permissions/summary'],
    queryFn: () => apiRequest('GET', '/api/driver/permissions/summary').then(res => res.json()),
  });

  const handleSendVerificationEmail = async () => {
    try {
      await apiRequest('POST', '/api/email/send-verification');
      // Show success message
    } catch (error) {
      console.error('Error sending verification email:', error);
    }
  };

  const handleInitiateBackgroundCheck = async () => {
    try {
      await apiRequest('POST', '/api/background-check/initiate', { provider: 'mock' });
      refetch();
    } catch (error) {
      console.error('Error initiating background check:', error);
    }
  };

  if (isLoading) {
    return <div className="animate-pulse">Loading permissions...</div>;
  }

  if (!permissions) {
    return <Alert><AlertDescription>Unable to load driver permissions</AlertDescription></Alert>;
  }

  const getStatusIcon = (status: boolean, pending = false) => {
    if (pending) return <Clock className="h-4 w-4 text-yellow-500" />;
    return status ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      partial: 'outline',
      full: 'default',
      suspended: 'destructive'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Driver Status: {getStatusBadge(summary.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary.restrictions.length > 0 && (
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Current Restrictions:</strong>
                  <ul className="mt-1 ml-4 list-disc">
                    {summary.restrictions.map((restriction, index) => (
                      <li key={index}>{restriction}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {summary.nextSteps.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Next Steps:</h4>
                <ul className="space-y-1">
                  {summary.nextSteps.map((step, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detailed Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>Email Verified</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(permissions.emailVerified)}
                {!permissions.emailVerified && showActions && (
                  <Button size="sm" variant="outline" onClick={handleSendVerificationEmail}>
                    Send Email
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>Background Check</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(permissions.backgroundCheckApproved)}
                {!permissions.backgroundCheckApproved && showActions && (
                  <Button size="sm" variant="outline" onClick={handleInitiateBackgroundCheck}>
                    Start Check
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4" />
                <span>Documents Verified</span>
              </div>
              {getStatusIcon(permissions.documentsVerified)}
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                <span>Account Active</span>
              </div>
              {getStatusIcon(permissions.accountActive)}
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Current Permissions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="flex justify-between">
                <span>View Ride Requests:</span>
                <Badge variant={permissions.canViewRideRequests ? "default" : "secondary"}>
                  {permissions.canViewRideRequests ? "Allowed" : "Restricted"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Accept Rides:</span>
                <Badge variant={permissions.canAcceptRides ? "default" : "secondary"}>
                  {permissions.canAcceptRides ? "Allowed" : "Restricted"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Max Concurrent Rides:</span>
                <Badge variant="outline">{permissions.maxConcurrentRides}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Requires Approval:</span>
                <Badge variant={permissions.requiresApprovalForRides ? "secondary" : "default"}>
                  {permissions.requiresApprovalForRides ? "Yes" : "No"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DriverPermissionsStatus;
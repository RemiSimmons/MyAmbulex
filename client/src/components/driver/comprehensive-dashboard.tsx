import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  FileText, 
  Car, 
  MapPin, 
  Clock, 
  DollarSign,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  BarChart3,
  Calendar,
  Navigation,
  Phone,
  Mail,
  Eye,
  Settings,
  Upload,
  ArrowLeft,
  Home,
  LogOut
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import RealTimeTracking from '@/components/real-time-tracking';
import NotificationManager from '@/components/notification-manager';
import EnhancedGPSTracker from '@/components/enhanced-gps-tracker';
import DashboardRealTimeUpdates from '@/components/driver/dashboard-real-time-updates';

interface DriverStatus {
  isVerified: boolean;
  isOnline: boolean;
  currentLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  permissions: {
    canViewRideRequests: boolean;
    canAcceptRides: boolean;
    canBidOnRides: boolean;
    emailVerified: boolean;
    backgroundCheckApproved: boolean;
    documentsVerified: boolean;
  };
  application: {
    status: 'pending' | 'approved' | 'rejected' | 'incomplete';
    backgroundCheckStatus: 'pending' | 'in_progress' | 'approved' | 'rejected';
    documentsStatus: 'pending' | 'approved' | 'rejected' | 'incomplete';
  };
  compliance: {
    licenseExpiry: string;
    insuranceExpiry: string;
    backgroundCheckExpiry?: string;
    nextRequiredAction?: string;
    daysUntilExpiry: number;
  };
}

interface DashboardStats {
  todayEarnings: number;
  weekEarnings: number;
  monthEarnings: number;
  totalRides: number;
  completedRides: number;
  cancelledRides: number;
  averageRating: number;
  onlineHours: number;
  responseRate: number;
}

interface ActiveRide {
  id: number;
  status: string;
  pickupTime: string;
  pickupAddress: string;
  dropoffAddress: string;
  riderName: string;
  estimatedDuration: number;
  fare: number;
}

function ComprehensiveDriverDashboard() {
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [isOnline, setIsOnline] = useState(false);
  const [currentRide, setCurrentRide] = useState<ActiveRide | null>(null);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Real-time data queries
  const { data: driverStatus, isLoading: statusLoading, error: statusError, refetch: refetchStatus } = useQuery<DriverStatus>({
    queryKey: ['/api/driver/status'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Add error handling and logging
  React.useEffect(() => {
    if (statusError) {
      console.error('Driver status error:', statusError);
    }
    if (driverStatus) {
      console.log('Driver status data:', driverStatus);
    }
  }, [driverStatus, statusError]);

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (statusError || !driverStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading driver status</p>
          <p className="text-sm text-gray-500">Please refresh the page or contact support</p>
        </div>
      </div>
    );
  }

  // Ensure permissions object exists with default values
  const permissions = driverStatus.permissions || {
    canViewRideRequests: false,
    canAcceptRides: false,
    canBidOnRides: false,
    emailVerified: false,
    backgroundCheckApproved: false,
    documentsVerified: false
  };

  const { data: dashboardStats } = useQuery<DashboardStats>({
    queryKey: ['/api/driver/stats'],
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: activeRide } = useQuery<ActiveRide>({
    queryKey: ['/api/driver/active-ride'],
    refetchInterval: 10000, // Refresh every 10 seconds
    enabled: isOnline,
  });

  const { data: upcomingRides } = useQuery({
    queryKey: ['/api/driver/upcoming-rides'],
    refetchInterval: 30000,
  });

  const { data: recentNotifications } = useQuery({
    queryKey: ['/api/notifications'],
    refetchInterval: 15000,
  });

  // Toggle online status
  const toggleOnlineStatus = async () => {
    try {
      const response = await fetch('/api/driver/toggle-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline: !isOnline })
      });

      if (response.ok) {
        setIsOnline(!isOnline);
        toast({
          title: isOnline ? "You're now offline" : "You're now online",
          description: isOnline ? "You won't receive new ride requests" : "You can now receive ride requests",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  // Get status color and text
  const getStatusDisplay = () => {
    if (!driverStatus?.isVerified) {
      return { color: 'text-yellow-600', bg: 'bg-yellow-100', text: 'Pending Verification' };
    }
    if (isOnline) {
      return { color: 'text-green-600', bg: 'bg-green-100', text: 'Online' };
    }
    return { color: 'text-gray-600', bg: 'bg-gray-100', text: 'Offline' };
  };

  const statusDisplay = getStatusDisplay();

  // Calculate compliance score
  const calculateComplianceScore = () => {
    if (!driverStatus) return 0;
    
    const factors = [
      permissions.emailVerified,
      permissions.backgroundCheckApproved,
      permissions.documentsVerified,
      driverStatus.application?.status === 'approved',
      (driverStatus.compliance?.daysUntilExpiry || 0) > 30
    ];
    
    return Math.round((factors.filter(Boolean).length / factors.length) * 100);
  };

  const complianceScore = calculateComplianceScore();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 space-y-6">
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/driver/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              Welcome, {user?.fullName?.split(' ')[0] || user?.username}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Header with Status */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Driver Dashboard</h1>
            <p className="text-muted-foreground">Real-time status and earnings overview</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge className={`${statusDisplay.bg} ${statusDisplay.color}`}>
              {statusDisplay.text}
            </Badge>
            
            <Button
              onClick={toggleOnlineStatus}
              variant={isOnline ? 'destructive' : 'default'}
              disabled={!driverStatus?.isVerified}
            >
              {isOnline ? 'Go Offline' : 'Go Online'}
            </Button>
          </div>
        </div>

        {/* Verification Alert */}
        {!driverStatus?.isVerified && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your account is pending verification. Complete your profile and document submission to start earning.
              <Button variant="link" className="p-0 ml-2" onClick={() => setActiveTab('compliance')}>
                View Requirements
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Active Ride Alert */}
        {currentRide && (
          <Alert className="border-blue-200 bg-blue-50">
            <Navigation className="h-4 w-4" />
            <AlertDescription>
              <div className="flex justify-between items-center">
                <div>
                  <strong>Active Ride:</strong> {currentRide.pickupAddress} → {currentRide.dropoffAddress}
                  <div className="text-sm text-muted-foreground">
                    Pickup: {new Date(currentRide.pickupTime).toLocaleTimeString()}
                  </div>
                </div>
                <Button size="sm" onClick={() => setActiveTab('tracking')}>
                  View Details
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Stats - Mobile Optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Today's Earnings</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">${dashboardStats?.todayEarnings?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="ml-3 flex-shrink-0">
                  <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed Rides</p>
                  <p className="text-2xl font-bold">{dashboardStats?.completedRides || 0}</p>
                </div>
                <Car className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                  <p className="text-2xl font-bold">{dashboardStats?.averageRating?.toFixed(1) || '5.0'}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Online Hours</p>
                  <p className="text-2xl font-bold">{dashboardStats?.onlineHours?.toFixed(1) || '0.0'}h</p>
                </div>
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="rides">Rides</TabsTrigger>
            <TabsTrigger value="tracking">Tracking</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="notifications">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Real-Time Updates */}
            <DashboardRealTimeUpdates />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weekly Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Earnings Goal</span>
                      <span className="font-medium">${dashboardStats?.weekEarnings || 0} / $500</span>
                    </div>
                    <Progress value={((dashboardStats?.weekEarnings || 0) / 500) * 100} />
                    
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{dashboardStats?.totalRides || 0}</p>
                        <p className="text-sm text-muted-foreground">Total Rides</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{dashboardStats?.responseRate || 0}%</p>
                        <p className="text-sm text-muted-foreground">Response Rate</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming Rides */}
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Rides</CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingRides?.length > 0 ? (
                    <div className="space-y-3">
                      {upcomingRides.slice(0, 3).map((ride: any) => (
                        <div key={ride.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{ride.pickupAddress}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(ride.scheduledTime).toLocaleString()}
                            </p>
                          </div>
                          <Badge variant="outline">${ride.estimatedFare}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No upcoming rides scheduled
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Compliance Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Compliance Status
                  <Badge variant={complianceScore >= 80 ? 'default' : 'destructive'}>
                    {complianceScore}% Complete
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    {permissions.emailVerified ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    )}
                    <span>Email Verified</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {permissions.backgroundCheckApproved ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    )}
                    <span>Background Check</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {permissions.documentsVerified ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    )}
                    <span>Documents Verified</span>
                  </div>
                </div>

                {driverStatus?.compliance?.nextRequiredAction && (
                  <Alert className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Action Required:</strong> {driverStatus?.compliance?.nextRequiredAction}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tracking">
            <div className="space-y-6">
              {currentRide ? (
                <RealTimeTracking 
                  rideId={currentRide.id} 
                  isDriver={true}
                />
              ) : (
                <EnhancedGPSTracker
                  rideId={0}
                  isActive={isOnline}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationManager />
          </TabsContent>

          <TabsContent value="compliance">
            <div className="space-y-6">
              {/* Document Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Document Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5" />
                        <div>
                          <p className="font-medium">Driver's License</p>
                          <p className="text-sm text-muted-foreground">
                            Expires: {driverStatus?.compliance?.licenseExpiry || 'Not available'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="default">Verified</Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5" />
                        <div>
                          <p className="font-medium">Insurance Policy</p>
                          <p className="text-sm text-muted-foreground">
                            Expires: {driverStatus?.compliance?.insuranceExpiry || 'Not available'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="default">Verified</Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5" />
                        <div>
                          <p className="font-medium">Background Check</p>
                          <p className="text-sm text-muted-foreground">
                            Status: {driverStatus?.application?.backgroundCheckStatus || 'pending'}
                          </p>
                        </div>
                      </div>
                      <Badge variant={driverStatus?.application?.backgroundCheckStatus === 'approved' ? 'default' : 'secondary'}>
                        {driverStatus?.application?.backgroundCheckStatus || 'pending'}
                      </Badge>
                    </div>
                  </div>

                  <Button className="w-full mt-6" onClick={() => setActiveTab('documents')}>
                    <Upload className="h-4 w-4 mr-2" />
                    Update Documents
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Background Check Upload</CardTitle>
                  <CardDescription>
                    Upload your background check report to complete your driver verification.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Background Check Upload */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <div className="space-y-2">
                        <p className="text-lg font-medium">Upload Background Check</p>
                        <p className="text-sm text-muted-foreground">
                          Upload your criminal background check report (PDF, max 10MB)
                        </p>
                      </div>
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        id="background-check-upload"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const formData = new FormData();
                              formData.append('backgroundCheck', file);
                              
                              const response = await fetch('/api/driver/upload/background-check', {
                                method: 'POST',
                                body: formData,
                              });
                              
                              if (response.ok) {
                                const result = await response.json();
                                console.log('Upload successful:', result.message);
                                // Refresh driver status
                                window.location.reload();
                              } else {
                                const error = await response.json();
                                console.error('Upload failed:', error.message);
                              }
                            } catch (error) {
                              console.error('Upload error:', error);
                            }
                          }
                        }}
                      />
                      <label htmlFor="background-check-upload">
                        <Button variant="outline" className="mt-4" asChild>
                          <span className="cursor-pointer">
                            Choose File
                          </span>
                        </Button>
                      </label>
                    </div>

                    {/* Other Documents */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-3">
                          <FileText className="h-5 w-5" />
                          <div>
                            <p className="font-medium">Driver's License</p>
                            <p className="text-sm text-muted-foreground">Current status: Verified</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="w-full">
                          Re-upload License
                        </Button>
                      </div>

                      <div className="border rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-3">
                          <FileText className="h-5 w-5" />
                          <div>
                            <p className="font-medium">Insurance</p>
                            <p className="text-sm text-muted-foreground">Current status: Verified</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="w-full">
                          Re-upload Insurance
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Compliance Alerts */}
              {driverStatus?.compliance?.daysUntilExpiry && driverStatus.compliance.daysUntilExpiry < 30 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Your documents expire in {driverStatus?.compliance?.daysUntilExpiry || 'unknown'} days. 
                    Please update them to avoid service interruption.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          {/* Other tabs content would go here */}
        </Tabs>
      </div>
    </div>
  );
}

export { ComprehensiveDriverDashboard };
export default ComprehensiveDriverDashboard;
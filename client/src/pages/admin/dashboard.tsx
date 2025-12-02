import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DriverVerificationPanel } from '@/components/admin/driver-verification-panel';
import { Button } from '@/components/ui/button';
import { 
  AlertCircle, 
  Car, 
  CheckCircle2, 
  DollarSign, 
  FileBadge, 
  FileCheck2, 
  Loader2, 
  Users, 
  MapPin, 
  BarChart3, 
  UserCog, 
  MessageSquare, 
  Settings, 
  Bell,
  Ban,
  Route,
  Clock,
  Calendar,
  Truck,
  Wrench,
  Search,
  Filter,
  LogOut
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { format } from 'date-fns';
import React from 'react';

// Driver Registration Progress Card Component
const DriverRegistrationProgressCard = ({ driverId }: { driverId: number }) => {
  const { data: registrationProgress, isLoading } = useQuery({
    queryKey: ['/api/admin/driver-registration-progress', driverId],
    enabled: !!driverId,
    retry: false
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registration Progress & Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!registrationProgress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registration Progress & Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground p-4">
            No registration progress data found
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatAvailabilityTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderAvailabilitySettings = () => {
    if (!registrationProgress.availabilitySettings) {
      return (
        <div className="text-muted-foreground">
          No availability settings configured
        </div>
      );
    }

    const settings = registrationProgress.availabilitySettings;
    
    return (
      <div className="space-y-3">
        {Object.entries(settings).map(([period, config]: [string, any]) => (
          <div key={period} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center">
              <Badge variant={config.available ? "default" : "secondary"} className="mr-2">
                {config.available ? "Available" : "Unavailable"}
              </Badge>
              <span className="font-medium capitalize">
                {period.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            </div>
            {config.available && (
              <div className="text-sm text-muted-foreground">
                {formatAvailabilityTime(config.startTime)} - {formatAvailabilityTime(config.endTime)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          Registration Progress & Availability
        </CardTitle>
        <CardDescription>
          Driver onboarding step {registrationProgress.step} of 6
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">Current Step</h4>
          <Badge variant="outline">
            Step {registrationProgress.step}: {
              registrationProgress.step === 0 ? "Personal Information" :
              registrationProgress.step === 1 ? "Vehicle Information" :
              registrationProgress.step === 2 ? "Document Upload" :
              registrationProgress.step === 3 ? "Availability Settings" :
              registrationProgress.step === 4 ? "Stripe Connect Setup" :
              registrationProgress.step === 5 ? "Review & Submit" :
              "Registration Complete"
            }
          </Badge>
        </div>

        {registrationProgress.formData && (
          <div>
            <h4 className="font-medium mb-2">Personal Information</h4>
            <div className="text-sm text-muted-foreground">
              ✓ Personal details completed
            </div>
          </div>
        )}

        {registrationProgress.vehicleData && (
          <div>
            <h4 className="font-medium mb-2">Vehicle Information</h4>
            <div className="text-sm text-muted-foreground">
              ✓ Vehicle details completed
            </div>
          </div>
        )}

        <div>
          <h4 className="font-medium mb-2">Availability Settings</h4>
          {renderAvailabilitySettings()}
        </div>

        <div className="text-xs text-muted-foreground">
          Last updated: {new Date(registrationProgress.lastSaved).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default function AdminDashboard() {
  const { user, logoutMutation } = useAuth();
  
  // Import required admin components
  const ComprehensiveAdminDashboard = React.lazy(() => import("@/components/admin/comprehensive-admin-dashboard"));
  
  // Determine if we should show the comprehensive dashboard
  const useComprehensiveDashboard = true; // Enable the new comprehensive dashboard
  const [, navigate] = useLocation();
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeRideTab, setActiveRideTab] = useState('all-rides');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCustomNotificationDialog, setShowCustomNotificationDialog] = useState(false);
  const [notificationRecipientType, setNotificationRecipientType] = useState('all');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showUserActionsDialog, setShowUserActionsDialog] = useState(false);
  const [isUpdatingPricing, setIsUpdatingPricing] = useState(false);
  const { toast } = useToast();
  const [basePricePerMile, setBasePricePerMile] = useState(2.5);
  const [baseWaitingRatePerMinute, setBaseWaitingRatePerMinute] = useState(0.25);
  const [wheelchairAccessibleMultiplier, setWheelchairAccessibleMultiplier] = useState(1.5);
  const [stretcherAccessibleMultiplier, setStretcherAccessibleMultiplier] = useState(2.0);
  const [nighttimeMultiplier, setNighttimeMultiplier] = useState(1.2);
  const [weekendMultiplier, setWeekendMultiplier] = useState(1.25);
  const [roundTripMultiplier, setRoundTripMultiplier] = useState(1.8);
  const [surgeFactor, setSurgeFactor] = useState(1.0);

  // Redirect to auth if not logged in or not an admin
  useEffect(() => {
    if (user === null) {
      navigate('/auth');
    } else if (user?.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/admin/stats'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/admin/stats');
        if (!res.ok) {
          throw new Error('Failed to fetch admin stats');
        }
        return await res.json();
      } catch (error) {
        console.error('Error fetching admin stats:', error);
        return null;
      }
    },
  });

  // Fetch pending drivers
  const { data: pendingDrivers, isLoading: isLoadingPendingDrivers } = useQuery({
    queryKey: ['/api/admin/pending-drivers'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/admin/pending-drivers');
        if (!res.ok) {
          throw new Error('Failed to fetch pending drivers');
        }
        return await res.json();
      } catch (error) {
        console.error('Error fetching pending drivers:', error);
        return [];
      }
    },
  });

  // Fetch verified drivers
  const { data: verifiedDrivers, isLoading: isLoadingVerifiedDrivers } = useQuery({
    queryKey: ['/api/admin/verified-drivers'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/admin/verified-drivers');
        if (!res.ok) {
          throw new Error('Failed to fetch verified drivers');
        }
        return await res.json();
      } catch (error) {
        console.error('Error fetching verified drivers:', error);
        return [];
      }
    },
  });

  // Fetch all rides with more details using optimized admin endpoint
  const { data: allRides, isLoading: isLoadingRides } = useQuery({
    queryKey: ['/api/admin/rides'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/admin/rides');
        if (!res.ok) {
          throw new Error('Failed to fetch rides');
        }
        return await res.json();
      } catch (error) {
        console.error('Error fetching rides:', error);
        return [];
      }
    },
  });

  // Fetch all users
  const { data: allUsers, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/admin/users');
        if (!res.ok) {
          throw new Error('Failed to fetch users');
        }
        return await res.json();
      } catch (error) {
        console.error('Error fetching users:', error);
        return [];
      }
    },
  });

  // Fetch driver details when a driver is selected
  const { data: driverDetails, isLoading: isLoadingDriverDetails } = useQuery({
    queryKey: [`/api/admin/driver/${selectedDriverId}`],
    queryFn: async () => {
      if (!selectedDriverId) return null;
      
      try {
        const res = await apiRequest('GET', `/api/admin/driver/${selectedDriverId}`);
        if (!res.ok) {
          throw new Error('Failed to fetch driver details');
        }
        return await res.json();
      } catch (error) {
        console.error('Error fetching driver details:', error);
        return null;
      }
    },
    enabled: !!selectedDriverId, // Only run the query if a driver is selected
  });

  // Fetch pricing settings
  const { data: pricingSettings, isLoading: isLoadingPricingSettings } = useQuery({
    queryKey: ['/api/admin/pricing-settings'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/admin/pricing-settings');
        if (!res.ok) {
          throw new Error('Failed to fetch pricing settings');
        }
        const data = await res.json();
        
        // Update state with fetched pricing settings
        setBasePricePerMile(data.basePricePerMile || 2.5);
        setBaseWaitingRatePerMinute(data.baseWaitingRatePerMinute || 0.25);
        setWheelchairAccessibleMultiplier(data.wheelchairAccessibleMultiplier || 1.5);
        setStretcherAccessibleMultiplier(data.stretcherAccessibleMultiplier || 2.0);
        setNighttimeMultiplier(data.nighttimeMultiplier || 1.2);
        setWeekendMultiplier(data.weekendMultiplier || 1.25);
        setRoundTripMultiplier(data.roundTripMultiplier || 1.8);
        setSurgeFactor(data.surgeFactor || 1.0);
        
        return data;
      } catch (error) {
        console.error('Error fetching pricing settings:', error);
        return null;
      }
    },
  });

  const handleDriverClick = (driverId: number) => {
    setSelectedDriverId(driverId);
    setActiveTab('driver-documents');
  };

  const handleUserClick = (userId: number) => {
    setSelectedUserId(userId);
    setShowUserActionsDialog(true);
  };

  const handleBackToList = () => {
    setSelectedDriverId(null);
    setActiveTab('drivers');
  };

  const handleSendCustomNotification = async () => {
    if (!notificationTitle || !notificationMessage) {
      toast({
        title: "Missing Fields",
        description: "Please fill in both title and message fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const payload = {
        recipientType: notificationRecipientType,
        title: notificationTitle,
        message: notificationMessage,
        userId: notificationRecipientType === 'specific' ? selectedUserId : undefined
      };

      const response = await apiRequest('POST', '/api/admin/send-notification', payload);
      
      if (response.ok) {
        toast({
          title: "Notification Sent",
          description: "Your notification has been sent successfully"
        });
        setShowCustomNotificationDialog(false);
        setNotificationTitle('');
        setNotificationMessage('');
      } else {
        throw new Error('Failed to send notification');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send notification. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleUserAction = async (action: string) => {
    try {
      const response = await apiRequest('POST', `/api/admin/user/${selectedUserId}/action`, {
        action
      });

      if (response.ok) {
        toast({
          title: "Action Successful",
          description: `User has been ${action}ed successfully`
        });
        setShowUserActionsDialog(false);
        queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      } else {
        throw new Error(`Failed to ${action} user`);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action} user. Please try again.`,
        variant: "destructive"
      });
    }
  };

  const handleUpdatePricingSettings = async () => {
    setIsUpdatingPricing(true);
    
    try {
      const pricingData = {
        basePricePerMile,
        baseWaitingRatePerMinute,
        wheelchairAccessibleMultiplier,
        stretcherAccessibleMultiplier,
        nighttimeMultiplier,
        weekendMultiplier,
        roundTripMultiplier,
        surgeFactor
      };

      const response = await apiRequest('PUT', '/api/admin/pricing-settings', pricingData);
      
      if (response.ok) {
        toast({
          title: "Settings Updated",
          description: "Pricing settings have been updated successfully"
        });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/pricing-settings'] });
      } else {
        throw new Error('Failed to update pricing settings');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update pricing settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingPricing(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-destructive/10 p-4 rounded-md text-destructive flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <p>You do not have permission to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  const isLoading = isLoadingStats || isLoadingPendingDrivers || isLoadingVerifiedDrivers;

  // Use comprehensive dashboard if enabled
  if (useComprehensiveDashboard) {
    return (
      <React.Suspense fallback={
        <div className="flex items-center justify-center min-h-[80vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }>
        <ComprehensiveAdminDashboard />
      </React.Suspense>
    );
  }

  const formatStatCards = () => {
    if (!stats) return null;

    const statCards = [
      {
        title: 'Total Riders',
        value: stats.totalRiders || 0,
        icon: <Users className="h-5 w-5 text-blue-500" />,
        color: 'blue',
        onClick: () => setActiveTab('users')
      },
      {
        title: 'Total Drivers',
        value: stats.totalDrivers || 0,
        icon: <Car className="h-5 w-5 text-green-500" />,
        color: 'green',
        onClick: () => setActiveTab('drivers')
      },
      {
        title: 'Pending Drivers',
        value: stats.pendingDrivers || 0,
        icon: <FileBadge className="h-5 w-5 text-yellow-500" />,
        color: 'yellow',
        onClick: () => {
          setActiveTab('drivers');
          setTimeout(() => {
            document.getElementById('pending-drivers')?.click();
          }, 100);
        }
      },
      {
        title: 'Active Drivers',
        value: stats.activeDrivers || 0,
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
        color: 'emerald',
        onClick: () => {
          setActiveTab('drivers');
          setTimeout(() => {
            document.getElementById('verified-drivers')?.click();
          }, 100);
        }
      },
      {
        title: 'Active Rides',
        value: allRides?.filter(ride => ['scheduled', 'en_route', 'arrived', 'in_progress'].includes(ride.status)).length || 0,
        icon: <Route className="h-5 w-5 text-purple-500" />,
        color: 'purple',
        onClick: () => {
          setActiveTab('rides');
          setActiveRideTab('active-rides');
        }
      },
      {
        title: 'Total Revenue',
        value: `$${stats.totalRevenue?.toFixed(2) || '0.00'}`,
        icon: <DollarSign className="h-5 w-5 text-teal-500" />,
        color: 'teal',
        onClick: () => setActiveTab('analytics')
      }
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {statCards.map((card, index) => (
          <Card 
            key={index} 
            className="cursor-pointer hover:bg-primary/5 transition-colors"
            onClick={card.onClick}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                {card.title}
                {card.icon}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold text-${card.color}-700`}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderDriverList = (drivers: any[] = [], isLoading: boolean, listType: string) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    if (!drivers || drivers.length === 0) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          {listType === 'pending' 
            ? 'No pending driver applications at this time.' 
            : 'No verified drivers found.'}
        </div>
      );
    }
    
    // Filter drivers based on search term
    const filteredDrivers = drivers.filter(driver => {
      const fullName = driver.user?.fullName || '';
      const email = driver.user?.email || '';
      const phone = driver.user?.phone || '';
      
      return fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             email.toLowerCase().includes(searchTerm.toLowerCase()) ||
             phone.toLowerCase().includes(searchTerm.toLowerCase());
    });
    
    return (
      <div className="space-y-4">
        <div className="mb-4">
          <Input
            placeholder="Search drivers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>
        
        {filteredDrivers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No drivers found matching your search criteria.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDrivers.map((driver) => (
              <Card 
                key={driver.id} 
                className="cursor-pointer hover:bg-primary/5 transition-colors"
                onClick={() => handleDriverClick(driver.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-4">
                        <AvatarImage src={driver.user?.profileImageUrl || ''} />
                        <AvatarFallback>{driver.user?.fullName?.charAt(0) || 'D'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">{driver.user?.fullName || 'Unknown'}</h3>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{driver.user?.email || 'No email'}</span>
                          <span>•</span>
                          <span>{driver.user?.phone || 'No phone'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span 
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          driver.accountStatus === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : driver.accountStatus === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {driver.accountStatus === 'active' 
                          ? 'Active' 
                          : driver.accountStatus === 'rejected'
                          ? 'Rejected'
                          : 'Pending'}
                      </span>
                      <Button variant="ghost" size="sm" className="ml-2">
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Driver details component
  const renderDriverDetailsPanel = () => {
    if (!driverDetails) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    const { driverDetails: driver, user, vehicle } = driverDetails;

    // Prepare document list for verification panel
    const documentsList = [
      {
        type: 'license',
        url: driver.licensePhotoFront,
        title: 'Driver\'s License',
        isVerified: driver.licenseVerified
      },
      {
        type: 'insurance',
        url: driver.insuranceDocumentUrl,
        title: 'Insurance Document',
        isVerified: driver.insuranceVerified
      },
      {
        type: 'vehicle',
        url: vehicle?.registrationDocumentUrl,
        title: 'Vehicle Registration',
        isVerified: driver.vehicleVerified
      },
      {
        type: 'background_check',
        url: driver.backgroundCheckDocumentUrl,
        title: 'Background Check',
        isVerified: driver.backgroundCheckStatus === 'approved'
      },
      {
        type: 'medical_certification',
        url: driver.medicalCertificationUrl,
        title: 'Medical Certification',
        isVerified: driver.medicalCertificationVerified
      }
    ];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={handleBackToList}>
            Back to List
          </Button>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedUserId(user.id);
                setShowCustomNotificationDialog(true);
                setNotificationRecipientType('specific');
              }}
            >
              <Bell className="h-4 w-4 mr-2" /> Send Notification
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => {
                setSelectedUserId(user.id);
                setShowUserActionsDialog(true);
              }}
            >
              <UserCog className="h-4 w-4 mr-2" /> User Actions
            </Button>
          </div>
        </div>
        
        <DriverVerificationPanel 
          driverId={driver.id}
          driverUserId={user.id}
          driverName={user.fullName}
          driverEmail={user.email}
          applicationStatus={driver.accountStatus}
          documentsList={documentsList}
          onVerified={handleBackToList}
        />
        
        {/* Driver Registration Progress & Availability Settings */}
        <DriverRegistrationProgressCard driverId={user.id} />
        
        {/* Driver's current location if they're on a ride */}
        {driver.currentLocation && (
          <Card>
            <CardHeader>
              <CardTitle>Current Location</CardTitle>
              <CardDescription>Driver's real-time location</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] bg-gray-100 rounded-md flex items-center justify-center">
                <MapPin className="h-8 w-8 text-primary" />
                <span className="ml-2">
                  Lat: {driver.currentLocation.lat.toFixed(6)}, 
                  Lng: {driver.currentLocation.lng.toFixed(6)}
                </span>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                Open in Google Maps
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    );
  };

  const renderUsersList = () => {
    if (isLoadingUsers) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!allUsers || allUsers.length === 0) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          No users found.
        </div>
      );
    }

    // Filter users based on search and status
    const filteredUsers = allUsers.filter(user => {
      const matchesSearch = 
        user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = 
        statusFilter === 'all' || 
        user.accountStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });

    return (
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 mr-3">
                          <AvatarImage src={user.profileImageUrl || ''} />
                          <AvatarFallback>{user.fullName?.charAt(0) || user.username?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.fullName || 'No name'}</p>
                          <p className="text-xs text-muted-foreground">{user.email || 'No email'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'destructive' : user.role === 'driver' ? 'outline' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        user.accountStatus === 'active' ? 'default' : 
                        user.accountStatus === 'blocked' ? 'destructive' :
                        user.accountStatus === 'pending' ? 'outline' : 'secondary'
                      }>
                        {user.accountStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(user.createdAt), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleUserClick(user.id)}
                      >
                        <UserCog className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderRidesList = () => {
    if (isLoadingRides) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!allRides || allRides.length === 0) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          No rides found.
        </div>
      );
    }

    // Filter rides based on active tab
    let filteredRides = [...allRides]; // Clone the array
    
    if (activeRideTab === 'active-rides') {
      filteredRides = filteredRides.filter(ride => 
        ['scheduled', 'en_route', 'arrived', 'in_progress'].includes(ride.status)
      );
    } else if (activeRideTab === 'completed-rides') {
      filteredRides = filteredRides.filter(ride => ride.status === 'completed');
    } else if (activeRideTab === 'cancelled-rides') {
      filteredRides = filteredRides.filter(ride => ride.status === 'cancelled');
    }
    
    // Filter rides based on search
    if (searchTerm) {
      filteredRides = filteredRides.filter(ride => 
        ride.pickupLocation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ride.dropoffLocation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ride.id.toString().includes(searchTerm)
      );
    }
    
    // Sort rides by createdAt date, most recent first
    filteredRides.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <Input
            placeholder="Search rides..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>From → To</TableHead>
                  <TableHead>Rider</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRides.map(ride => (
                  <TableRow key={ride.id}>
                    <TableCell>#{ride.id}</TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        <p className="truncate text-xs">{ride.pickupLocation}</p>
                        <p className="text-center text-xs">↓</p>
                        <p className="truncate text-xs">{ride.dropoffLocation}</p>
                      </div>
                    </TableCell>
                    <TableCell>{ride.riderName || ride.riderId}</TableCell>
                    <TableCell>{ride.driverName || ride.driverId || 'Not assigned'}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          ride.status === 'completed' ? 'default' : 
                          ride.status === 'cancelled' ? 'destructive' :
                          ['en_route', 'arrived', 'in_progress'].includes(ride.status) ? 'secondary' :
                          'outline'
                        }
                      >
                        {ride.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(ride.createdAt), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm">
                          <Search className="h-4 w-4" />
                        </Button>
                        {['en_route', 'arrived', 'in_progress'].includes(ride.status) && (
                          <Button variant="ghost" size="sm">
                            <MapPin className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderPricingSettings = () => {
    if (isLoadingPricingSettings) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Base Pricing Configuration</CardTitle>
            <CardDescription>Set the base rates and multipliers for ride pricing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="basePricePerMile" className="flex justify-between">
                  <span>Base Price Per Mile</span>
                  <span className="font-semibold">${basePricePerMile.toFixed(2)}</span>
                </Label>
                <Slider 
                  id="basePricePerMile"
                  defaultValue={[basePricePerMile]} 
                  min={1.0} 
                  max={5.0} 
                  step={0.1}
                  onValueChange={(values) => setBasePricePerMile(values[0])}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label htmlFor="baseWaitingRatePerMinute" className="flex justify-between">
                  <span>Base Waiting Rate Per Minute</span>
                  <span className="font-semibold">${baseWaitingRatePerMinute.toFixed(2)}</span>
                </Label>
                <Slider 
                  id="baseWaitingRatePerMinute"
                  defaultValue={[baseWaitingRatePerMinute]} 
                  min={0.1} 
                  max={1.0} 
                  step={0.05}
                  onValueChange={(values) => setBaseWaitingRatePerMinute(values[0])}
                  className="mt-2"
                />
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-lg font-medium mb-4">Multipliers</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="wheelchairAccessibleMultiplier" className="flex justify-between">
                    <span>Wheelchair Accessible</span>
                    <span className="font-semibold">{wheelchairAccessibleMultiplier.toFixed(2)}x</span>
                  </Label>
                  <Slider 
                    id="wheelchairAccessibleMultiplier"
                    defaultValue={[wheelchairAccessibleMultiplier]} 
                    min={1.0} 
                    max={3.0} 
                    step={0.1}
                    onValueChange={(values) => setWheelchairAccessibleMultiplier(values[0])}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="stretcherAccessibleMultiplier" className="flex justify-between">
                    <span>Stretcher Accessible</span>
                    <span className="font-semibold">{stretcherAccessibleMultiplier.toFixed(2)}x</span>
                  </Label>
                  <Slider 
                    id="stretcherAccessibleMultiplier"
                    defaultValue={[stretcherAccessibleMultiplier]} 
                    min={1.0} 
                    max={4.0} 
                    step={0.1}
                    onValueChange={(values) => setStretcherAccessibleMultiplier(values[0])}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="nighttimeMultiplier" className="flex justify-between">
                    <span>Nighttime (10 PM - 6 AM)</span>
                    <span className="font-semibold">{nighttimeMultiplier.toFixed(2)}x</span>
                  </Label>
                  <Slider 
                    id="nighttimeMultiplier"
                    defaultValue={[nighttimeMultiplier]} 
                    min={1.0} 
                    max={2.0} 
                    step={0.05}
                    onValueChange={(values) => setNighttimeMultiplier(values[0])}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="weekendMultiplier" className="flex justify-between">
                    <span>Weekend (Sat-Sun)</span>
                    <span className="font-semibold">{weekendMultiplier.toFixed(2)}x</span>
                  </Label>
                  <Slider 
                    id="weekendMultiplier"
                    defaultValue={[weekendMultiplier]} 
                    min={1.0} 
                    max={2.0} 
                    step={0.05}
                    onValueChange={(values) => setWeekendMultiplier(values[0])}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="roundTripMultiplier" className="flex justify-between">
                    <span>Round Trip</span>
                    <span className="font-semibold">{roundTripMultiplier.toFixed(2)}x</span>
                  </Label>
                  <Slider 
                    id="roundTripMultiplier"
                    defaultValue={[roundTripMultiplier]} 
                    min={1.5} 
                    max={2.5} 
                    step={0.1}
                    onValueChange={(values) => setRoundTripMultiplier(values[0])}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-lg font-medium mb-4">Dynamic Pricing</h3>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="surgeFactor" className="flex justify-between">
                    <span>Surge Pricing Factor (current)</span>
                    <span className="font-semibold">{surgeFactor.toFixed(2)}x</span>
                  </Label>
                  <Slider 
                    id="surgeFactor"
                    defaultValue={[surgeFactor]} 
                    min={1.0} 
                    max={3.0} 
                    step={0.1}
                    onValueChange={(values) => setSurgeFactor(values[0])}
                  />
                  <p className="text-sm text-muted-foreground">
                    Surge pricing is applied during high demand periods. Increase this factor when demand exceeds supply.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleUpdatePricingSettings} 
              disabled={isUpdatingPricing}
              className="ml-auto"
            >
              {isUpdatingPricing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Pricing Settings
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  };

  // Legacy version of driver details display function
  const renderDriverDetailsSummary = () => {
    if (!driverDetails) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    const { driverDetails: driver, user, vehicle } = driverDetails;

    // Prepare document list for verification panel
    const documentsList = [
      {
        type: 'license',
        url: driver.licensePhotoFront,
        title: 'Driver\'s License',
        isVerified: driver.licenseVerified
      },
      {
        type: 'insurance',
        url: driver.insuranceDocumentUrl,
        title: 'Insurance Document',
        isVerified: driver.insuranceVerified
      },
      {
        type: 'vehicle',
        url: vehicle?.registrationDocumentUrl,
        title: 'Vehicle Registration',
        isVerified: driver.vehicleVerified
      },
      {
        type: 'background_check',
        url: driver.backgroundCheckDocumentUrl,
        title: 'Background Check',
        isVerified: driver.backgroundCheckStatus === 'approved'
      },
      {
        type: 'medical_certification',
        url: driver.medicalCertificationUrl,
        title: 'Medical Certification',
        isVerified: driver.medicalCertificationVerified
      }
    ];

    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={handleBackToList}>
          Back to List
        </Button>
        
        <DriverVerificationPanel 
          driverId={driver.id}
          driverUserId={user.id}
          driverName={user.fullName}
          driverEmail={user.email}
          applicationStatus={driver.accountStatus}
          documentsList={documentsList}
          onVerified={handleBackToList}
        />
      </div>
    );
  };

  const renderAnalytics = () => {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Revenue metrics over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] bg-gray-50 flex items-center justify-center">
              <BarChart3 className="h-16 w-16 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Ride Completion Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] bg-gray-50 flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Driver Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] bg-gray-50 flex items-center justify-center">
                <Car className="h-12 w-12 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col space-y-2 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Complete platform management with insights and controls.
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              console.log('Admin logout initiated');
              logoutMutation.mutate();
            }}
            disabled={logoutMutation.isPending}
            className="flex items-center gap-2"
          >
            {logoutMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            Logout
          </Button>
        </div>
      </div>

      {formatStatCards()}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-7 mb-6">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="drivers">
            <Car className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Drivers</span>
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="rides">
            <Route className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Rides</span>
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="pricing">
            <DollarSign className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Pricing</span>
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Settings</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Active Rides</CardTitle>
                <CardDescription>Current rides in progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {allRides?.filter(ride => ['en_route', 'arrived', 'in_progress'].includes(ride.status)).length === 0 ? (
                    <p className="text-center text-muted-foreground">No active rides at the moment</p>
                  ) : (
                    allRides?.filter(ride => ['en_route', 'arrived', 'in_progress'].includes(ride.status))
                      .slice(0, 3)
                      .map(ride => (
                        <div key={ride.id} className="p-3 border rounded-md">
                          <div className="flex justify-between items-center">
                            <Badge variant="outline">{ride.status.replace(/_/g, ' ')}</Badge>
                            <span className="text-xs text-muted-foreground">#{ride.id}</span>
                          </div>
                          <p className="mt-2 text-sm font-medium truncate">{ride.pickupLocation}</p>
                          <p className="text-xs text-muted-foreground truncate">{ride.dropoffLocation}</p>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => { setActiveTab('rides'); setActiveRideTab('active-rides'); }}>
                  View All Active Rides
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Pending Driver Documents</CardTitle>
                <CardDescription>Documents awaiting verification</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingDrivers?.length === 0 ? (
                    <p className="text-center text-muted-foreground">No pending documents</p>
                  ) : (
                    pendingDrivers?.slice(0, 3).map(driver => (
                      <div key={driver.id} className="p-3 border rounded-md">
                        <div className="flex justify-between items-center">
                          <p className="font-medium">{driver.user?.fullName || 'Unknown'}</p>
                          <Badge>{driver.accountStatus}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{driver.user?.email || 'No email'}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => { setActiveTab('drivers'); }}>
                  View All Pending Drivers
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Users</CardTitle>
                <CardDescription>Recently registered users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {allUsers?.length === 0 ? (
                    <p className="text-center text-muted-foreground">No recent users</p>
                  ) : (
                    allUsers?.slice(0, 3).map(user => (
                      <div key={user.id} className="p-3 border rounded-md">
                        <div className="flex justify-between items-center">
                          <p className="font-medium">{user.fullName || user.username}</p>
                          <Badge variant={user.role === 'admin' ? 'destructive' : user.role === 'driver' ? 'outline' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{user.email || 'No email'}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => setActiveTab('users')}>
                  View All Users
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button variant="outline" className="h-auto py-4 flex flex-col justify-center" onClick={() => setShowCustomNotificationDialog(true)}>
                    <Bell className="h-6 w-6 mb-2" />
                    <span>Send System Notification</span>
                  </Button>
                  
                  <Button variant="outline" className="h-auto py-4 flex flex-col justify-center" onClick={() => setActiveTab('pricing')}>
                    <DollarSign className="h-6 w-6 mb-2" />
                    <span>Adjust Pricing</span>
                  </Button>
                  
                  <Button variant="outline" className="h-auto py-4 flex flex-col justify-center" onClick={() => { setActiveTab('drivers'); }}>
                    <FileCheck2 className="h-6 w-6 mb-2" />
                    <span>Review Driver Documents</span>
                  </Button>
                  
                  <Button variant="outline" className="h-auto py-4 flex flex-col justify-center" onClick={() => { setActiveTab('rides'); setActiveRideTab('active-rides'); }}>
                    <MapPin className="h-6 w-6 mb-2" />
                    <span>Track Active Rides</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="drivers">
          {selectedDriverId ? (
            renderDriverDetailsSummary()
          ) : (
            <Tabs defaultValue="pending-drivers">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger id="pending-drivers" value="pending-drivers">Pending Drivers</TabsTrigger>
                <TabsTrigger id="verified-drivers" value="verified-drivers">Verified Drivers</TabsTrigger>
              </TabsList>
              
              <TabsContent value="pending-drivers">
                <Card>
                  <CardHeader>
                    <CardTitle>Driver Applications Pending Review</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderDriverList(pendingDrivers, isLoadingPendingDrivers, 'pending')}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="verified-drivers">
                <Card>
                  <CardHeader>
                    <CardTitle>Verified Drivers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderDriverList(verifiedDrivers, isLoadingVerifiedDrivers, 'verified')}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </TabsContent>
        
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>View and manage all system users</CardDescription>
            </CardHeader>
            <CardContent>
              {renderUsersList()}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="rides">
          <Card>
            <CardHeader>
              <CardTitle>Ride Management</CardTitle>
              <CardDescription>Monitor and manage all rides in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all-rides" value={activeRideTab} onValueChange={setActiveRideTab}>
                <TabsList className="mb-6">
                  <TabsTrigger value="all-rides">All Rides</TabsTrigger>
                  <TabsTrigger value="active-rides">Active Rides</TabsTrigger>
                  <TabsTrigger value="completed-rides">Completed Rides</TabsTrigger>
                  <TabsTrigger value="cancelled-rides">Cancelled Rides</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all-rides">
                  {renderRidesList()}
                </TabsContent>
                
                <TabsContent value="active-rides">
                  {renderRidesList()}
                </TabsContent>
                
                <TabsContent value="completed-rides">
                  {renderRidesList()}
                </TabsContent>
                
                <TabsContent value="cancelled-rides">
                  {renderRidesList()}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics">
          {renderAnalytics()}
        </TabsContent>
        
        <TabsContent value="pricing">
          {renderPricingSettings()}
        </TabsContent>
        
        <TabsContent value="settings">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>Configure global system settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="enable-chat">Enable Chat System</Label>
                    <Switch id="enable-chat" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="enable-notifications">Enable Push Notifications</Label>
                    <Switch id="enable-notifications" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="enable-tracking">Enable Driver Tracking</Label>
                    <Switch id="enable-tracking" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                    <Switch id="maintenance-mode" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Types</CardTitle>
                <CardDescription>Configure available vehicle types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between space-x-2">
                    <div className="flex items-center space-x-2">
                      <Truck className="h-5 w-5" />
                      <Label htmlFor="standard">Standard</Label>
                    </div>
                    <Switch id="standard" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between space-x-2">
                    <div className="flex items-center space-x-2">
                      <Wrench className="h-5 w-5" />
                      <Label htmlFor="wheelchair">Wheelchair Accessible</Label>
                    </div>
                    <Switch id="wheelchair" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between space-x-2">
                    <div className="flex items-center space-x-2">
                      <Car className="h-5 w-5" />
                      <Label htmlFor="stretcher">Stretcher Accessible</Label>
                    </div>
                    <Switch id="stretcher" defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Custom Notification Dialog */}
      <Dialog open={showCustomNotificationDialog} onOpenChange={setShowCustomNotificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Notification</DialogTitle>
            <DialogDescription>
              Send a custom notification to users in the system.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipient-type">Recipient</Label>
              <Select value={notificationRecipientType} onValueChange={setNotificationRecipientType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select recipient type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="riders">All Riders</SelectItem>
                  <SelectItem value="drivers">All Drivers</SelectItem>
                  <SelectItem value="specific">Specific User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {notificationRecipientType === 'specific' && (
              <div className="space-y-2">
                <Label htmlFor="user-id">User ID</Label>
                <Input 
                  id="user-id" 
                  type="number" 
                  value={selectedUserId || ''} 
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
                  placeholder="Enter user ID" 
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="notification-title">Title</Label>
              <Input 
                id="notification-title" 
                value={notificationTitle} 
                onChange={(e) => setNotificationTitle(e.target.value)}
                placeholder="Notification title" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notification-message">Message</Label>
              <Textarea 
                id="notification-message" 
                value={notificationMessage} 
                onChange={(e) => setNotificationMessage(e.target.value)}
                placeholder="Enter your notification message" 
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomNotificationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendCustomNotification}>
              Send Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* User Actions Dialog */}
      <Dialog open={showUserActionsDialog} onOpenChange={setShowUserActionsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Actions</DialogTitle>
            <DialogDescription>
              Manage actions for user ID: {selectedUserId}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" onClick={() => handleUserAction('block')}>
                <Ban className="h-4 w-4 mr-2" /> Block User
              </Button>
              <Button variant="outline" onClick={() => handleUserAction('unblock')}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Unblock User
              </Button>
              <Button variant="outline" onClick={() => handleUserAction('resetPassword')}>
                <Settings className="h-4 w-4 mr-2" /> Reset Password
              </Button>
              <Button variant="destructive" onClick={() => handleUserAction('delete')}>
                <AlertCircle className="h-4 w-4 mr-2" /> Delete User
              </Button>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label>Send Custom Notification</Label>
              <div className="space-y-2">
                <Input 
                  placeholder="Notification title" 
                  value={notificationTitle} 
                  onChange={(e) => setNotificationTitle(e.target.value)}
                />
                <Textarea 
                  placeholder="Notification message" 
                  value={notificationMessage} 
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  rows={3}
                />
                <Button 
                  className="w-full" 
                  onClick={() => {
                    handleSendCustomNotification();
                    setShowUserActionsDialog(false);
                  }}
                >
                  <Bell className="h-4 w-4 mr-2" /> Send Notification
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserActionsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
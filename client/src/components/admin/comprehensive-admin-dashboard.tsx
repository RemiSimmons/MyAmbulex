import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';

// Import new modular components
import { DashboardOverview } from '@/components/admin/dashboard-overview';
import { UsersManagement } from '@/components/admin/users-management';
import { DriversManagement } from '@/components/admin/drivers-management';
import { RidesManagement } from '@/components/admin/rides-management';
import { AdminOverrideDialog } from '@/components/admin/admin-override-dialog';
import { DocumentReviewDialog } from '@/components/admin/document-review-dialog';
import { PlatformAnalytics } from '@/components/admin/platform-analytics';
import { SystemMonitoring } from '@/components/admin/system-monitoring';

// Interface definitions for type safety
interface AdminStats {
  totalUsers: number;
  activeDrivers: number;
  pendingDrivers: number;
  totalRides: number;
  activeRides: number;
  completedRides: number;
  totalRevenue: number;
  dailyRevenue: number;
  systemStatus: 'operational' | 'degraded' | 'down';
}

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  dbConnections: number;
  apiResponseTime: number;
  errorRate: number;
  uptime: string;
}

interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'rider' | 'driver' | 'admin';
  emailVerified: boolean;
  phoneVerified: boolean;
  accountStatus: 'active' | 'suspended' | 'blocked' | 'pending';
  createdAt: string;
  lastLogin?: string;
}

interface Driver extends User {
  verified: boolean;
  backgroundCheckStatus: 'pending' | 'approved' | 'rejected';
  documentsVerified: boolean;
  vehicleCount: number;
  totalRides: number;
  rating: number;
  earnings: number;
  onlineStatus: boolean;
  driverDetails: any;
}

interface Ride {
  id: number;
  referenceNumber: string;
  riderId: number;
  driverId?: number;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  scheduledTime: string;
  estimatedPrice: number;
  finalPrice?: number;
  createdAt: string;
  completedAt?: string;
}

interface DriverDetails {
  id: number;
  licensePhotoFront?: string;
  licensePhotoBack?: string;
  insuranceDocumentUrl?: string;
  vehicleRegistrationUrl?: string;
  backgroundCheckDocumentUrl?: string;
  medicalCertificationUrl?: string;
  profilePictureUrl?: string;
  licenseVerified?: boolean;
  insuranceVerified?: boolean;
  vehicleVerified?: boolean;
  profileVerified?: boolean;
  medicalCertificationVerified?: boolean;
  backgroundCheckStatus?: 'pending' | 'approved' | 'rejected';
  documentsVerified?: boolean;
}

interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'rider' | 'driver' | 'admin';
  emailVerified: boolean;
  phoneVerified: boolean;
  accountStatus: 'active' | 'suspended' | 'blocked' | 'pending';
  createdAt: string;
  lastLogin?: string;
  driverDetails?: DriverDetails | null;
}

interface Driver extends User {
  verified: boolean;
  backgroundCheckStatus: 'pending' | 'approved' | 'rejected';
  documentsVerified: boolean;
  vehicleCount: number;
  totalRides: number;
  rating: number;
  earnings: number;
  onlineStatus: boolean;
  driverDetails: DriverDetails | null;
}

interface Ride {
  id: number;
  referenceNumber: string;
  riderId: number;
  driverId?: number;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  scheduledTime: string;
  estimatedPrice: number;
  finalPrice?: number;
  createdAt: string;
  completedAt?: string;
}

interface OverrideAction {
  id: string;
  action: string;
  reason: string;
  timestamp: string;
  adminId: number;
  targetType: 'user' | 'ride' | 'driver' | 'system';
  targetId: number;
  details: any;
}

export function ComprehensiveAdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // Core state management
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [showDocumentReviewDialog, setShowDocumentReviewDialog] = useState(false);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [overrideAction, setOverrideAction] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  // Fetch admin statistics
  const { data: adminStats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    refetchInterval: 30000
  });

  // Fetch system metrics
  const { data: systemMetrics, isLoading: metricsLoading } = useQuery<SystemMetrics>({
    queryKey: ['/api/admin/system-metrics'],
    refetchInterval: 10000
  });

  // Fetch all data with consolidated queries  
  const { data: adminRides, isLoading: ridesLoading } = useQuery<Ride[]>({
    queryKey: ['/api/admin/rides'],
    refetchInterval: 30000
  });

  const { data: adminUsers, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    refetchInterval: 30000
  });

  const { data: adminDrivers, isLoading: driversLoading } = useQuery<Driver[]>({
    queryKey: ['/api/admin/drivers'],
    refetchInterval: 30000
  });



  // Override action mutation
  const overrideMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/admin/override', data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Override Applied",
        description: data.message || "Administrative override has been applied successfully",
      });
      setShowOverrideDialog(false);
      setOverrideAction('');
      setOverrideReason('');
      queryClient.invalidateQueries({ queryKey: ['/api/admin'] });
    },
    onError: () => {
      toast({
        title: "Override Failed",
        description: "Failed to apply administrative override",
        variant: "destructive",
      });
    }
  });

  // User action mutation
  const userActionMutation = useMutation({
    mutationFn: async (data: { userId: number; action: string; reason?: string }) => {
      const response = await apiRequest('POST', `/api/admin/users/${data.userId}/action`, {
        action: data.action,
        reason: data.reason
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Action Completed",
        description: data.message || "User action completed successfully",
      });
      // Invalidate specific queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/drivers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    }
  });

  // Ride action mutation
  const rideActionMutation = useMutation({
    mutationFn: async (data: { rideId: number; action: string; reason?: string }) => {
      const response = await apiRequest('POST', `/api/admin/rides/${data.rideId}/action`, {
        action: data.action,
        reason: data.reason
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Ride Action Completed",
        description: data.message || "Ride action completed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin'] });
    }
  });

  // System action mutation
  const systemActionMutation = useMutation({
    mutationFn: async (data: { action: string; parameters?: any }) => {
      const response = await apiRequest('POST', '/api/admin/system/action', data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "System Action Completed",
        description: data.message || "System action completed successfully",
      });
    }
  });

  // Reset onboarding mutation
  const resetOnboardingMutation = useMutation({
    mutationFn: async (driverId: number) => {
      const response = await apiRequest('POST', `/api/admin/drivers/${driverId}/reset-onboarding`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Onboarding Reset",
        description: data.message || "Driver onboarding has been reset successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/drivers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset driver onboarding",
        variant: "destructive",
      });
    }
  });

  // Clear documents mutation
  const clearDocumentsMutation = useMutation({
    mutationFn: async (driverId: number) => {
      const response = await apiRequest('POST', `/api/admin/drivers/${driverId}/clear-documents`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Documents Cleared",
        description: data.message || "Driver documents have been cleared successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/drivers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Clear Failed",
        description: error.message || "Failed to clear driver documents",
        variant: "destructive",
      });
    }
  });

  // Use the fetched data with proper fallbacks
  const allUsers = adminUsers || [];
  const allDrivers = adminDrivers || [];
  const allRides = adminRides || [];



  const handleOverride = async () => {
    if (!overrideAction || !overrideReason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please select an action and provide a reason",
        variant: "destructive",
      });
      return;
    }

    overrideMutation.mutate({
      action: overrideAction,
      reason: overrideReason,
      targetId: selectedUser?.id || selectedRide?.id,
      targetType: selectedUser ? 'user' : 'ride'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'approved':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'blocked':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };





  // Navigation handlers
  const handleNavigateToPromo = () => setLocation('/admin/promo-codes');
  const handleNavigateToUsers = () => setActiveTab('users');
  const handleNavigateToDrivers = () => setActiveTab('drivers');
  const handleNavigateToRides = () => setActiveTab('rides');

  // Dialog handlers
  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setShowOverrideDialog(true);
  };

  const handleSelectRide = (ride: Ride) => {
    setSelectedRide(ride);
    setShowOverrideDialog(true);
  };

  const handleShowDocumentReview = (driver: Driver) => {
    setSelectedUser(driver);
    setShowDocumentReviewDialog(true);
  };

  const handleShowOverrideDialog = (target: User | Ride) => {
    if ('role' in target) {
      setSelectedUser(target);
    } else {
      setSelectedRide(target);
    }
    setShowOverrideDialog(true);
  };

  const handleCloseOverrideDialog = () => {
    setShowOverrideDialog(false);
    setSelectedUser(null);
    setSelectedRide(null);
    setOverrideAction('');
    setOverrideReason('');
  };

  const handleCloseDocumentReview = () => {
    setShowDocumentReviewDialog(false);
    setSelectedUser(null);
  };

  return (
    <div className="min-h-screen bg-gray-50/30 p-2 sm:p-4 lg:p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
          <TabsTrigger value="rides">Rides</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <DashboardOverview
            adminStats={adminStats}
            systemMetrics={systemMetrics}
            statsLoading={statsLoading}
            metricsLoading={metricsLoading}
            onNavigateToPromo={handleNavigateToPromo}
            onNavigateToUsers={handleNavigateToUsers}
            onNavigateToDrivers={handleNavigateToDrivers}
            onNavigateToRides={handleNavigateToRides}
          />
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <UsersManagement
            adminUsers={adminUsers}
            usersLoading={usersLoading}
            onSelectUser={handleSelectUser}
            onShowOverrideDialog={handleShowOverrideDialog}
          />
        </TabsContent>

        <TabsContent value="drivers" className="mt-4">
          <DriversManagement
            adminDrivers={adminDrivers}
            driversLoading={driversLoading}
            onSelectDriver={handleSelectUser}
            onShowDocumentReview={handleShowDocumentReview}
            onShowOverrideDialog={handleShowOverrideDialog}
          />
        </TabsContent>

        <TabsContent value="rides" className="mt-4">
          <RidesManagement
            adminRides={adminRides}
            ridesLoading={ridesLoading}
            onSelectRide={handleSelectRide}
            onShowOverrideDialog={handleShowOverrideDialog}
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PlatformAnalytics />
            <SystemMonitoring />
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AdminOverrideDialog
        isOpen={showOverrideDialog}
        onClose={handleCloseOverrideDialog}
        selectedUser={selectedUser}
        selectedRide={selectedRide}
        overrideAction={overrideAction}
        overrideReason={overrideReason}
        onActionChange={setOverrideAction}
        onReasonChange={setOverrideReason}
      />

      {selectedUser && (
        <DocumentReviewDialog
          isOpen={showDocumentReviewDialog}
          onClose={handleCloseDocumentReview}
          driverId={selectedUser.id}
          driverName={selectedUser.fullName || selectedUser.username}
        />
      )}
    </div>
  );
}

export default ComprehensiveAdminDashboard;

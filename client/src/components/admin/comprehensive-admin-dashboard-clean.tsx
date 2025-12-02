import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Users, 
  Car, 
  MapPin, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Settings, 
  Shield, 
  Ban, 
  Play, 
  Pause, 
  RefreshCw,
  FileText,
  Eye,
  Edit,
  Trash2,
  Download,
  Upload,
  Mail,
  Phone,
  Navigation,
  BarChart3,
  TrendingUp,
  Activity,
  Server,
  Database,
  Wifi,
  WifiOff,
  UserCheck,
  UserX,
  CarIcon,
  Calendar,
  Filter,
  Search,
  MoreHorizontal
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Type definitions
interface AdminStats {
  totalUsers: number;
  totalDrivers: number;
  totalRides: number;
  totalRevenue: number;
  activeRides: number;
  pendingVerifications: number;
  systemAlerts: number;
  platformFee: number;
}

interface SystemMetrics {
  serverStatus: 'online' | 'offline' | 'maintenance';
  databaseStatus: 'connected' | 'disconnected' | 'slow';
  apiResponseTime: number;
  activeConnections: number;
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

export default function ComprehensiveAdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [showDocumentReviewDialog, setShowDocumentReviewDialog] = useState(false);
  const [overrideAction, setOverrideAction] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  // Data fetching
  const { data: adminStats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    refetchInterval: 30000
  });

  const { data: systemMetrics, isLoading: metricsLoading } = useQuery<SystemMetrics>({
    queryKey: ['/api/admin/system-metrics'],
    refetchInterval: 10000
  });

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

  // Mutations
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin'] });
    }
  });

  // Helper functions
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

  // Filter functions
  const filteredDrivers = adminDrivers?.filter((driver: Driver) => {
    const matchesSearch = !searchQuery || 
      driver.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.username?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || driver.accountStatus === filterStatus;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const filteredRides = adminRides?.filter((ride: Ride) => {
    const matchesSearch = !searchQuery || 
      ride.referenceNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || ride.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const filteredUsers = adminUsers?.filter((user: User) => {
    const matchesSearch = !searchQuery || 
      user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.accountStatus === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  }) || [];

  if (statsLoading || metricsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Comprehensive platform management and oversight</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminStats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">All registered users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminStats?.totalDrivers || 0}</div>
              <p className="text-xs text-muted-foreground">Verified drivers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rides</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminStats?.totalRides || 0}</div>
              <p className="text-xs text-muted-foreground">All time rides</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${adminStats?.totalRevenue || 0}</div>
              <p className="text-xs text-muted-foreground">Total earnings</p>
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Server Status</span>
                <Badge className={systemMetrics?.serverStatus === 'online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {systemMetrics?.serverStatus || 'Unknown'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Database</span>
                <Badge className={systemMetrics?.databaseStatus === 'connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {systemMetrics?.databaseStatus || 'Unknown'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">API Response</span>
                <span className="font-semibold">{systemMetrics?.apiResponseTime || 0}ms</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="drivers">Drivers</TabsTrigger>
            <TabsTrigger value="rides">Rides</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">Activity monitoring coming soon</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">No active alerts</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <div className="flex gap-4">
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-sm"
                  />
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="rider">Riders</SelectItem>
                      <SelectItem value="driver">Drivers</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-semibold">{user.fullName}</h3>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline">{user.role}</Badge>
                            <Badge className={getStatusColor(user.accountStatus)}>
                              {user.accountStatus}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedUser(user)}
                        >
                          View Details
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-8">No users found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="drivers">
            <Card>
              <CardHeader>
                <CardTitle>Driver Management</CardTitle>
                <Input
                  placeholder="Search drivers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredDrivers.length > 0 ? (
                    filteredDrivers.map((driver) => (
                      <div key={driver.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-semibold">{driver.fullName}</h3>
                          <p className="text-sm text-gray-600">{driver.email}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge className={getStatusColor(driver.backgroundCheckStatus)}>
                              {driver.backgroundCheckStatus}
                            </Badge>
                            <Badge variant="outline">
                              {driver.totalRides} rides
                            </Badge>
                            <Badge variant="outline">
                              {driver.rating}/5 stars
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDriver(driver)}
                        >
                          View Details
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-8">No drivers found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rides">
            <Card>
              <CardHeader>
                <CardTitle>Ride Management</CardTitle>
                <Input
                  placeholder="Search rides..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredRides.length > 0 ? (
                    filteredRides.map((ride) => (
                      <div key={ride.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-semibold">{ride.referenceNumber}</h3>
                          <p className="text-sm text-gray-600">
                            {ride.pickupAddress} → {ride.dropoffAddress}
                          </p>
                          <div className="flex gap-2 mt-1">
                            <Badge className={getStatusColor(ride.status)}>
                              {ride.status}
                            </Badge>
                            <Badge variant="outline">
                              ${ride.estimatedPrice}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRide(ride)}
                        >
                          View Details
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-8">No rides found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
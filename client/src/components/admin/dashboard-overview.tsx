import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Car, 
  MapPin, 
  DollarSign, 
  Activity,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';

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

interface DashboardOverviewProps {
  adminStats: AdminStats | undefined;
  systemMetrics: SystemMetrics | undefined;
  statsLoading: boolean;
  metricsLoading: boolean;
  onNavigateToPromo: () => void;
  onNavigateToUsers: () => void;
  onNavigateToDrivers: () => void;
  onNavigateToRides: () => void;
}

export function DashboardOverview({
  adminStats,
  systemMetrics,
  statsLoading,
  metricsLoading,
  onNavigateToPromo,
  onNavigateToUsers,
  onNavigateToDrivers,
  onNavigateToRides
}: DashboardOverviewProps) {
  return (
    <div className="space-y-6">
      {/* System Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">System Overview</h2>
          <Badge 
            variant={adminStats?.systemStatus === 'operational' ? 'default' : 'destructive'}
            className="flex items-center gap-1"
          >
            {adminStats?.systemStatus === 'operational' ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <AlertTriangle className="h-3 w-3" />
            )}
            {adminStats?.systemStatus || 'Unknown'}
          </Badge>
        </div>
        <Button onClick={onNavigateToPromo} variant="outline">
          Promo Codes
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : adminStats?.totalUsers || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : adminStats?.activeDrivers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {adminStats?.pendingDrivers || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rides</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : adminStats?.totalRides || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {adminStats?.activeRides || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${statsLoading ? '...' : (adminStats?.totalRevenue || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              ${(adminStats?.dailyRevenue || 0).toFixed(2)} today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {metricsLoading ? '...' : `${systemMetrics?.cpuUsage || 0}%`}
              </div>
              <div className="text-sm text-muted-foreground">CPU Usage</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {metricsLoading ? '...' : `${systemMetrics?.memoryUsage || 0}%`}
              </div>
              <div className="text-sm text-muted-foreground">Memory</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {metricsLoading ? '...' : `${systemMetrics?.apiResponseTime || 0}ms`}
              </div>
              <div className="text-sm text-muted-foreground">Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {metricsLoading ? '...' : `${systemMetrics?.errorRate || 0}%`}
              </div>
              <div className="text-sm text-muted-foreground">Error Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={onNavigateToUsers} className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Manage Users
            </Button>
            <Button onClick={onNavigateToDrivers} className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              Review Drivers
            </Button>
            <Button onClick={onNavigateToRides} className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Monitor Rides
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  TrendingUp, 
  Users, 
  Clock,
  MapPin,
  DollarSign,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RealTimeUpdate {
  id: string;
  type: 'ride_request' | 'ride_accepted' | 'payment_received' | 'rating_received' | 'system_alert';
  title: string;
  message: string;
  timestamp: string;
  data?: any;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

interface LiveMetrics {
  activeDrivers: number;
  pendingRides: number;
  completedToday: number;
  totalEarningsToday: number;
  averageWaitTime: number;
  systemStatus: 'operational' | 'degraded' | 'down';
}

export function DashboardRealTimeUpdates() {
  const { toast } = useToast();
  const [updates, setUpdates] = useState<RealTimeUpdate[]>([]);
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics>({
    activeDrivers: 0,
    pendingRides: 0,
    completedToday: 0,
    totalEarningsToday: 0,
    averageWaitTime: 0,
    systemStatus: 'operational'
  });
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');

  useEffect(() => {
    // Setup Server-Sent Events connection for real-time updates
    const eventSource = new EventSource('/api/sse/driver-dashboard');
    
    eventSource.onopen = () => {
      setConnectionStatus('connected');
      console.log('Dashboard SSE connection established');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleRealTimeUpdate(data);
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = () => {
      setConnectionStatus('disconnected');
      console.error('Dashboard SSE connection error');
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
    };
  }, []);

  const handleRealTimeUpdate = (data: any) => {
    switch (data.event) {
      case 'metrics_update':
        setLiveMetrics(data.metrics);
        break;
        
      case 'ride_notification':
        const rideUpdate: RealTimeUpdate = {
          id: `ride_${Date.now()}`,
          type: 'ride_request',
          title: 'New Ride Request',
          message: `${data.pickupAddress} → ${data.dropoffAddress}`,
          timestamp: new Date().toISOString(),
          data: data,
          priority: 'high'
        };
        addUpdate(rideUpdate);
        
        toast({
          title: "New Ride Request",
          description: rideUpdate.message,
        });
        break;
        
      case 'payment_notification':
        const paymentUpdate: RealTimeUpdate = {
          id: `payment_${Date.now()}`,
          type: 'payment_received',
          title: 'Payment Received',
          message: `$${data.amount} for ride #${data.rideId}`,
          timestamp: new Date().toISOString(),
          data: data,
          priority: 'normal'
        };
        addUpdate(paymentUpdate);
        break;
        
      case 'system_alert':
        const systemUpdate: RealTimeUpdate = {
          id: `system_${Date.now()}`,
          type: 'system_alert',
          title: data.title || 'System Alert',
          message: data.message,
          timestamp: new Date().toISOString(),
          data: data,
          priority: data.priority || 'normal'
        };
        addUpdate(systemUpdate);
        
        if (systemUpdate.priority === 'urgent') {
          toast({
            title: systemUpdate.title,
            description: systemUpdate.message,
            variant: "destructive",
          });
        }
        break;
    }
  };

  const addUpdate = (update: RealTimeUpdate) => {
    setUpdates(prev => [update, ...prev.slice(0, 19)]); // Keep last 20 updates
  };

  const getUpdateIcon = (type: string) => {
    switch (type) {
      case 'ride_request':
      case 'ride_accepted':
        return <MapPin className="h-4 w-4" />;
      case 'payment_received':
        return <DollarSign className="h-4 w-4" />;
      case 'rating_received':
        return <Users className="h-4 w-4" />;
      case 'system_alert':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'normal':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'low':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Real-Time Dashboard</CardTitle>
            <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'}>
              {connectionStatus === 'connected' ? 'Live' : 'Disconnected'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{liveMetrics.activeDrivers}</div>
              <div className="text-xs text-muted-foreground">Active Drivers</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{liveMetrics.pendingRides}</div>
              <div className="text-xs text-muted-foreground">Pending Rides</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{liveMetrics.completedToday}</div>
              <div className="text-xs text-muted-foreground">Completed Today</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">${liveMetrics.totalEarningsToday.toFixed(0)}</div>
              <div className="text-xs text-muted-foreground">Earnings Today</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{liveMetrics.averageWaitTime}m</div>
              <div className="text-xs text-muted-foreground">Avg Wait Time</div>
            </div>
          </div>
          
          {liveMetrics.systemStatus !== 'operational' && (
            <Alert className="mt-4" variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                System Status: {liveMetrics.systemStatus.toUpperCase()} - Some features may be limited
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Live Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Live Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {updates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No recent activity</p>
              <p className="text-sm">Updates will appear here in real-time</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {updates.map((update) => (
                <div
                  key={update.id}
                  className={`p-3 rounded-lg border ${getPriorityColor(update.priority)}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5">
                      {getUpdateIcon(update.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium truncate">{update.title}</h4>
                        <span className="text-xs text-muted-foreground">
                          {new Date(update.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{update.message}</p>
                      
                      {update.type === 'ride_request' && update.data && (
                        <div className="mt-2 flex space-x-2">
                          <Badge variant="outline" className="text-xs">
                            ${update.data.estimatedFare}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {update.data.vehicleType}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions Based on Real-Time Data */}
      {liveMetrics.pendingRides > 0 && (
        <Alert>
          <TrendingUp className="h-4 w-4" />
          <AlertDescription>
            <div className="flex justify-between items-center">
              <span>
                {liveMetrics.pendingRides} ride{liveMetrics.pendingRides > 1 ? 's' : ''} waiting for drivers
              </span>
              <Badge variant="secondary">High Demand</Badge>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {connectionStatus === 'disconnected' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Real-time updates are currently unavailable. Attempting to reconnect...
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default DashboardRealTimeUpdates;
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Battery, 
  Signal, 
  AlertTriangle,
  Phone,
  MessageSquare,
  Maximize,
  Minimize
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  heading?: number;
  speed?: number;
  timestamp: string;
  batteryLevel?: number;
  isLocationServicesEnabled: boolean;
}

interface TrackingAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
}

interface RealTimeTrackingProps {
  rideId: number;
  isDriver?: boolean;
  onLocationUpdate?: (location: LocationData) => void;
}

export function RealTimeTracking({ rideId, isDriver = false, onLocationUpdate }: RealTimeTrackingProps) {
  const { toast } = useToast();
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationHistory, setLocationHistory] = useState<LocationData[]>([]);
  const [alerts, setAlerts] = useState<TrackingAlert[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [accuracy, setAccuracy] = useState<'high' | 'medium' | 'low'>('medium');
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const watchId = useRef<number | null>(null);
  const eventSource = useRef<EventSource | null>(null);
  const lastLocationTime = useRef<number>(0);
  const locationBuffer = useRef<LocationData[]>([]);

  // Enhanced geolocation options for better accuracy
  const geoOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000
  };

  useEffect(() => {
    if (isDriver) {
      initializeTracking();
    }
    
    // Setup SSE connection for real-time updates
    setupRealtimeConnection();

    return () => {
      cleanup();
    };
  }, [rideId, isDriver]);

  /**
   * Initialize GPS tracking for drivers
   */
  const initializeTracking = async () => {
    try {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }

      // Request permission if needed
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      if (permission.state === 'denied') {
        throw new Error('Location permission denied');
      }

      setIsTracking(true);
      startLocationWatch();
      
      toast({
        title: "GPS Tracking Started",
        description: "Real-time location tracking is now active",
      });
    } catch (error) {
      console.error('Error initializing tracking:', error);
      toast({
        title: "Tracking Error",
        description: error instanceof Error ? error.message : 'Failed to start tracking',
        variant: "destructive",
      });
    }
  };

  /**
   * Start watching location with enhanced accuracy
   */
  const startLocationWatch = () => {
    if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
    }

    watchId.current = navigator.geolocation.watchPosition(
      handleLocationUpdate,
      handleLocationError,
      geoOptions
    );
  };

  /**
   * Handle location updates with buffering and accuracy filtering
   */
  const handleLocationUpdate = (position: GeolocationPosition) => {
    const now = Date.now();
    
    // Throttle updates to prevent spam (minimum 5 seconds between updates)
    if (now - lastLocationTime.current < 5000) {
      return;
    }

    const location: LocationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      heading: position.coords.heading || undefined,
      speed: position.coords.speed ? position.coords.speed * 2.237 : undefined, // Convert m/s to mph
      timestamp: new Date().toISOString(),
      batteryLevel: getBatteryLevel(),
      isLocationServicesEnabled: true
    };

    // Filter out low accuracy readings (>100m accuracy)
    if (location.accuracy > 100) {
      console.warn('Low accuracy location filtered out:', location.accuracy);
      setAccuracy('low');
      return;
    } else if (location.accuracy > 50) {
      setAccuracy('medium');
    } else {
      setAccuracy('high');
    }

    // Add to buffer for batch processing
    locationBuffer.current.push(location);
    
    // Process buffer every 3 updates or 30 seconds
    if (locationBuffer.current.length >= 3 || now - lastLocationTime.current > 30000) {
      procesLocationBuffer();
    }

    setCurrentLocation(location);
    setLocationHistory(prev => [...prev.slice(-49), location]); // Keep last 50 locations
    onLocationUpdate?.(location);
    
    lastLocationTime.current = now;
  };

  /**
   * Process location buffer and send to server
   */
  const procesLocationBuffer = async () => {
    if (locationBuffer.current.length === 0) return;

    try {
      const locations = [...locationBuffer.current];
      locationBuffer.current = [];

      // Send batch update to server
      const response = await fetch(`/api/rides/${rideId}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locations })
      });

      if (!response.ok) {
        throw new Error('Failed to update location');
      }
    } catch (error) {
      console.error('Error updating location:', error);
      // Re-add failed locations to buffer for retry
      locationBuffer.current.unshift(...locationBuffer.current);
    }
  };

  /**
   * Handle location errors with smart retry
   */
  const handleLocationError = (error: GeolocationPositionError) => {
    console.error('Location error:', error);
    
    let message = 'Location error occurred';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'Location permission denied';
        severity = 'critical';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Location information unavailable';
        severity = 'high';
        break;
      case error.TIMEOUT:
        message = 'Location request timed out';
        severity = 'medium';
        // Retry with less strict options
        setTimeout(() => {
          startLocationWatch();
        }, 5000);
        break;
    }

    addAlert({
      id: `location_error_${Date.now()}`,
      type: 'location_error',
      severity,
      message,
      timestamp: new Date().toISOString()
    });

    if (severity === 'critical') {
      setIsTracking(false);
    }
  };

  /**
   * Setup Server-Sent Events for real-time updates
   */
  const setupRealtimeConnection = () => {
    try {
      eventSource.current = new EventSource(`/api/sse/tracking/${rideId}`);
      
      eventSource.current.onopen = () => {
        setConnectionStatus('connected');
        console.log('SSE connection established for ride tracking');
      };

      eventSource.current.onmessage = (event) => {
        handleRealtimeUpdate(JSON.parse(event.data));
      };

      eventSource.current.onerror = () => {
        setConnectionStatus('disconnected');
        console.error('SSE connection error');
        
        // Reconnect after 5 seconds
        setTimeout(() => {
          setupRealtimeConnection();
        }, 5000);
      };
    } catch (error) {
      console.error('Error setting up SSE connection:', error);
    }
  };

  /**
   * Handle real-time updates from SSE
   */
  const handleRealtimeUpdate = (data: any) => {
    switch (data.event) {
      case 'location_update':
        if (!isDriver && data.location) {
          setCurrentLocation(data.location);
          setLocationHistory(prev => [...prev.slice(-49), data.location]);
        }
        break;
      
      case 'ride_status_update':
        toast({
          title: "Ride Update",
          description: data.message || `Ride status: ${data.status}`,
        });
        break;
      
      case 'alert':
        addAlert(data);
        break;
    }
  };

  /**
   * Add tracking alert
   */
  const addAlert = (alert: TrackingAlert) => {
    setAlerts(prev => [alert, ...prev.slice(0, 9)]); // Keep last 10 alerts
    
    if (alert.severity === 'high' || alert.severity === 'critical') {
      toast({
        title: "Tracking Alert",
        description: alert.message,
        variant: alert.severity === 'critical' ? 'destructive' : 'default',
      });
    }
  };

  /**
   * Get battery level (if supported)
   */
  const getBatteryLevel = (): number | undefined => {
    // @ts-ignore - Battery API is experimental
    if ('getBattery' in navigator) {
      // @ts-ignore
      navigator.getBattery().then((battery) => {
        return Math.round(battery.level * 100);
      });
    }
    return undefined;
  };

  /**
   * Format speed for display
   */
  const formatSpeed = (speed?: number): string => {
    if (!speed) return '-- mph';
    return `${Math.round(speed)} mph`;
  };

  /**
   * Format accuracy badge
   */
  const getAccuracyBadge = () => {
    const variants = {
      high: 'default',
      medium: 'secondary',
      low: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[accuracy]} className="text-xs">
        <Signal className="h-3 w-3 mr-1" />
        {accuracy.toUpperCase()}
      </Badge>
    );
  };

  /**
   * Cleanup resources
   */
  const cleanup = () => {
    if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
    }
    
    if (eventSource.current) {
      eventSource.current.close();
    }
  };

  return (
    <Card className={`${isFullscreen ? 'fixed inset-0 z-50' : ''} transition-all duration-300`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <MapPin className="h-5 w-5" />
            <span>Real-Time Tracking</span>
            {getAccuracyBadge()}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge 
              variant={connectionStatus === 'connected' ? 'default' : 'destructive'}
              className="text-xs"
            >
              {connectionStatus.toUpperCase()}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Location Status */}
        {currentLocation && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Speed</div>
              <div className="flex items-center justify-center space-x-1">
                <Navigation className="h-4 w-4" />
                <span className="font-semibold">{formatSpeed(currentLocation.speed)}</span>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Accuracy</div>
              <div className="flex items-center justify-center space-x-1">
                <Signal className="h-4 w-4" />
                <span className="font-semibold">{Math.round(currentLocation.accuracy)}m</span>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Last Update</div>
              <div className="flex items-center justify-center space-x-1">
                <Clock className="h-4 w-4" />
                <span className="font-semibold">
                  {new Date(currentLocation.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
            
            {currentLocation.batteryLevel && (
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Battery</div>
                <div className="flex items-center justify-center space-x-1">
                  <Battery className="h-4 w-4" />
                  <span className="font-semibold">{currentLocation.batteryLevel}%</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tracking Controls for Drivers */}
        {isDriver && (
          <div className="flex items-center justify-center space-x-4">
            <Button
              onClick={isTracking ? () => setIsTracking(false) : initializeTracking}
              variant={isTracking ? 'destructive' : 'default'}
            >
              {isTracking ? 'Stop Tracking' : 'Start Tracking'}
            </Button>
            
            <Button variant="outline" size="sm">
              <Phone className="h-4 w-4 mr-2" />
              Call Rider
            </Button>
            
            <Button variant="outline" size="sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              Message
            </Button>
          </div>
        )}

        {/* Recent Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Recent Alerts</h4>
            {alerts.slice(0, 3).map((alert) => (
              <Alert 
                key={alert.id} 
                variant={alert.severity === 'critical' ? 'destructive' : 'default'}
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <div className="flex justify-between items-start">
                    <span>{alert.message}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Location History Summary */}
        {locationHistory.length > 0 && (
          <div className="text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Tracking Points:</span>
              <span>{locationHistory.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Started:</span>
              <span>{new Date(locationHistory[0].timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RealTimeTracking;
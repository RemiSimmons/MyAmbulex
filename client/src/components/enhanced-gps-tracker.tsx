import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Battery, 
  Signal, 
  AlertTriangle,
  Zap,
  Target,
  Route,
  Timer,
  Compass
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

interface GPSStats {
  totalPoints: number;
  averageAccuracy: number;
  topSpeed: number;
  totalDistance: number;
  trackingDuration: number;
  signalStrength: 'excellent' | 'good' | 'fair' | 'poor';
}

interface EnhancedGPSTrackerProps {
  rideId: number;
  isActive: boolean;
  onLocationUpdate?: (location: LocationData) => void;
  onTrackingStatusChange?: (isTracking: boolean) => void;
}

export function EnhancedGPSTracker({ 
  rideId, 
  isActive, 
  onLocationUpdate, 
  onTrackingStatusChange 
}: EnhancedGPSTrackerProps) {
  const { toast } = useToast();
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationHistory, setLocationHistory] = useState<LocationData[]>([]);
  const [gpsStats, setGpsStats] = useState<GPSStats>({
    totalPoints: 0,
    averageAccuracy: 0,
    topSpeed: 0,
    totalDistance: 0,
    trackingDuration: 0,
    signalStrength: 'fair'
  });
  const [accuracy, setAccuracy] = useState<'excellent' | 'good' | 'fair' | 'poor'>('fair');
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  const watchId = useRef<number | null>(null);
  const calibrationTimer = useRef<NodeJS.Timeout | null>(null);
  const trackingStartTime = useRef<Date | null>(null);
  const locationBuffer = useRef<LocationData[]>([]);
  const lastKnownPosition = useRef<{ lat: number; lng: number } | null>(null);

  // Enhanced geolocation options for maximum accuracy
  const highAccuracyOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 1000
  };

  const standardOptions: PositionOptions = {
    enableHighAccuracy: false,
    timeout: 10000,
    maximumAge: 5000
  };

  useEffect(() => {
    if (isActive) {
      initializeGPSTracking();
    } else {
      stopTracking();
    }

    return () => {
      cleanup();
    };
  }, [isActive]);

  useEffect(() => {
    checkPermissions();
  }, []);

  /**
   * Check GPS permissions and capabilities
   */
  const checkPermissions = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "GPS Not Supported",
        description: "Your device doesn't support GPS tracking",
        variant: "destructive",
      });
      return;
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      setPermissionStatus(permission.state as any);
      
      permission.onchange = () => {
        setPermissionStatus(permission.state as any);
      };
    } catch (error) {
      console.warn('Permission API not supported');
    }
  };

  /**
   * Initialize GPS tracking with calibration
   */
  const initializeGPSTracking = async () => {
    try {
      if (permissionStatus === 'denied') {
        throw new Error('Location permission denied');
      }

      setIsCalibrating(true);
      
      // Start with high accuracy for calibration
      await calibrateGPS();
      
      setIsTracking(true);
      trackingStartTime.current = new Date();
      onTrackingStatusChange?.(true);
      
      // Start regular tracking
      startLocationWatch();
      
      toast({
        title: "GPS Tracking Active",
        description: "High-precision location tracking started",
      });
    } catch (error) {
      console.error('Error initializing GPS tracking:', error);
      toast({
        title: "GPS Error",
        description: error instanceof Error ? error.message : 'Failed to start GPS tracking',
        variant: "destructive",
      });
      setIsCalibrating(false);
    }
  };

  /**
   * Calibrate GPS for better accuracy
   */
  const calibrateGPS = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      let calibrationAttempts = 0;
      const maxAttempts = 5;
      const calibrationReadings: LocationData[] = [];

      const calibrate = () => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const reading: LocationData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              heading: position.coords.heading || undefined,
              speed: position.coords.speed ? position.coords.speed * 2.237 : undefined,
              timestamp: new Date().toISOString(),
              isLocationServicesEnabled: true
            };

            calibrationReadings.push(reading);
            calibrationAttempts++;

            // Continue calibration or finish
            if (calibrationAttempts < maxAttempts && reading.accuracy > 20) {
              setTimeout(calibrate, 1000);
            } else {
              // Find best reading
              const bestReading = calibrationReadings.reduce((best, current) => 
                current.accuracy < best.accuracy ? current : best
              );

              lastKnownPosition.current = {
                lat: bestReading.latitude,
                lng: bestReading.longitude
              };

              setCurrentLocation(bestReading);
              setIsCalibrating(false);
              
              console.log(`GPS calibrated after ${calibrationAttempts} attempts. Best accuracy: ${bestReading.accuracy}m`);
              resolve();
            }
          },
          (error) => {
            calibrationAttempts++;
            if (calibrationAttempts >= maxAttempts) {
              setIsCalibrating(false);
              reject(error);
            } else {
              setTimeout(calibrate, 2000);
            }
          },
          highAccuracyOptions
        );
      };

      calibrate();
    });
  };

  /**
   * Start continuous location watching
   */
  const startLocationWatch = () => {
    if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
    }

    // Use high accuracy initially, then switch to standard if battery is low
    const options = gpsStats.signalStrength === 'poor' ? standardOptions : highAccuracyOptions;

    watchId.current = navigator.geolocation.watchPosition(
      handleLocationUpdate,
      handleLocationError,
      options
    );
  };

  /**
   * Handle location updates with advanced filtering
   */
  const handleLocationUpdate = useCallback((position: GeolocationPosition) => {
    const now = new Date();
    
    const location: LocationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      heading: position.coords.heading || undefined,
      speed: position.coords.speed ? position.coords.speed * 2.237 : undefined,
      timestamp: now.toISOString(),
      batteryLevel: getBatteryLevel(),
      isLocationServicesEnabled: true
    };

    // Advanced filtering
    if (!isValidLocation(location)) {
      console.warn('Invalid location filtered out:', location);
      return;
    }

    // Update accuracy rating
    updateAccuracyRating(location.accuracy);

    // Calculate distance from last known position
    let distance = 0;
    if (lastKnownPosition.current) {
      distance = calculateDistance(
        lastKnownPosition.current.lat,
        lastKnownPosition.current.lng,
        location.latitude,
        location.longitude
      );
    }

    // Update stats
    updateGPSStats(location, distance);

    // Add to buffer for batch processing
    locationBuffer.current.push(location);

    // Process buffer if conditions are met
    if (shouldProcessBuffer()) {
      processLocationBuffer();
    }

    setCurrentLocation(location);
    setLocationHistory(prev => [...prev.slice(-99), location]); // Keep last 100
    setLastUpdateTime(now);
    
    lastKnownPosition.current = {
      lat: location.latitude,
      lng: location.longitude
    };

    onLocationUpdate?.(location);
  }, []);

  /**
   * Validate location data quality
   */
  const isValidLocation = (location: LocationData): boolean => {
    // Filter out obviously bad readings
    if (location.accuracy > 100) return false;
    if (location.latitude === 0 && location.longitude === 0) return false;
    if (Math.abs(location.latitude) > 90 || Math.abs(location.longitude) > 180) return false;

    // Check for impossible speed (over 200 mph)
    if (location.speed && location.speed > 200) return false;

    // Check against last known position for impossible jumps
    if (lastKnownPosition.current) {
      const distance = calculateDistance(
        lastKnownPosition.current.lat,
        lastKnownPosition.current.lng,
        location.latitude,
        location.longitude
      );
      
      // If distance is over 1km in 5 seconds, it's probably bad data
      const timeDiff = 5; // Assume 5 second intervals
      const maxSpeed = 100; // 100 mph reasonable max
      const maxDistance = (maxSpeed * 1.609 * timeDiff) / 3600; // km
      
      if (distance > maxDistance) return false;
    }

    return true;
  };

  /**
   * Update accuracy rating based on GPS precision
   */
  const updateAccuracyRating = (accuracy: number) => {
    let rating: 'excellent' | 'good' | 'fair' | 'poor';
    
    if (accuracy <= 5) rating = 'excellent';
    else if (accuracy <= 15) rating = 'good';
    else if (accuracy <= 50) rating = 'fair';
    else rating = 'poor';
    
    setAccuracy(rating);
  };

  /**
   * Update GPS statistics
   */
  const updateGPSStats = (location: LocationData, distance: number) => {
    setGpsStats(prev => {
      const totalPoints = prev.totalPoints + 1;
      const totalDistance = prev.totalDistance + distance;
      const averageAccuracy = ((prev.averageAccuracy * prev.totalPoints) + location.accuracy) / totalPoints;
      const topSpeed = Math.max(prev.topSpeed, location.speed || 0);
      const trackingDuration = trackingStartTime.current 
        ? (Date.now() - trackingStartTime.current.getTime()) / 1000 
        : 0;

      // Determine signal strength based on recent accuracy readings
      let signalStrength: 'excellent' | 'good' | 'fair' | 'poor' = 'fair';
      if (averageAccuracy <= 10) signalStrength = 'excellent';
      else if (averageAccuracy <= 25) signalStrength = 'good';
      else if (averageAccuracy <= 50) signalStrength = 'fair';
      else signalStrength = 'poor';

      return {
        totalPoints,
        averageAccuracy,
        topSpeed,
        totalDistance,
        trackingDuration,
        signalStrength
      };
    });
  };

  /**
   * Check if we should process the location buffer
   */
  const shouldProcessBuffer = (): boolean => {
    return locationBuffer.current.length >= 3 || 
           (locationBuffer.current.length > 0 && Date.now() - new Date(locationBuffer.current[0].timestamp).getTime() > 30000);
  };

  /**
   * Process buffered locations
   */
  const processLocationBuffer = async () => {
    if (locationBuffer.current.length === 0) return;

    try {
      const locations = [...locationBuffer.current];
      locationBuffer.current = [];

      // Send to server
      const response = await fetch(`/api/rides/${rideId}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locations })
      });

      if (!response.ok) {
        throw new Error('Failed to send location data');
      }

      console.log(`Sent ${locations.length} location updates to server`);
    } catch (error) {
      console.error('Error sending location updates:', error);
      // Put locations back in buffer for retry
      locationBuffer.current.unshift(...locationBuffer.current);
    }
  };

  /**
   * Handle location errors with smart recovery
   */
  const handleLocationError = (error: GeolocationPositionError) => {
    console.error('GPS error:', error);
    
    let message = 'GPS error occurred';
    let shouldRetry = false;
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'Location permission denied';
        setPermissionStatus('denied');
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'GPS signal unavailable';
        shouldRetry = true;
        break;
      case error.TIMEOUT:
        message = 'GPS timeout - retrying with lower accuracy';
        shouldRetry = true;
        break;
    }

    toast({
      title: "GPS Issue",
      description: message,
      variant: error.code === error.PERMISSION_DENIED ? 'destructive' : 'default',
    });

    // Retry with fallback options
    if (shouldRetry) {
      setTimeout(() => {
        startLocationWatch();
      }, 5000);
    }
  };

  /**
   * Calculate distance between two points
   */
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  /**
   * Get battery level if available
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
   * Stop GPS tracking
   */
  const stopTracking = () => {
    if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    if (calibrationTimer.current) {
      clearTimeout(calibrationTimer.current);
      calibrationTimer.current = null;
    }

    // Process any remaining buffered locations
    if (locationBuffer.current.length > 0) {
      processLocationBuffer();
    }

    setIsTracking(false);
    setIsCalibrating(false);
    onTrackingStatusChange?.(false);
  };

  /**
   * Cleanup resources
   */
  const cleanup = () => {
    stopTracking();
  };

  /**
   * Get accuracy color
   */
  const getAccuracyColor = () => {
    switch (accuracy) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  /**
   * Get signal strength progress value
   */
  const getSignalStrengthValue = () => {
    switch (gpsStats.signalStrength) {
      case 'excellent': return 90;
      case 'good': return 70;
      case 'fair': return 50;
      case 'poor': return 25;
      default: return 0;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Navigation className="h-5 w-5" />
            <span>Enhanced GPS Tracker</span>
            {isCalibrating && <Badge variant="secondary">Calibrating...</Badge>}
            {isTracking && !isCalibrating && (
              <Badge variant="default" className={getAccuracyColor()}>
                {accuracy.toUpperCase()}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Signal className="h-4 w-4" />
            <Progress 
              value={getSignalStrengthValue()} 
              className="w-16 h-2"
            />
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {permissionStatus === 'denied' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Location access denied. Enable location permissions to use GPS tracking.
            </AlertDescription>
          </Alert>
        )}

        {isCalibrating && (
          <Alert>
            <Target className="h-4 w-4" />
            <AlertDescription>
              Calibrating GPS for maximum accuracy. This may take a few moments...
            </AlertDescription>
          </Alert>
        )}

        {/* Real-time Stats */}
        {currentLocation && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Current Speed</div>
              <div className="flex items-center justify-center space-x-1">
                <Zap className="h-4 w-4" />
                <span className="font-semibold text-lg">
                  {currentLocation.speed ? `${Math.round(currentLocation.speed)} mph` : '-- mph'}
                </span>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Accuracy</div>
              <div className="flex items-center justify-center space-x-1">
                <Target className="h-4 w-4" />
                <span className={`font-semibold text-lg ${getAccuracyColor()}`}>
                  ±{Math.round(currentLocation.accuracy)}m
                </span>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Heading</div>
              <div className="flex items-center justify-center space-x-1">
                <Compass className="h-4 w-4" />
                <span className="font-semibold text-lg">
                  {currentLocation.heading ? `${Math.round(currentLocation.heading)}°` : '--°'}
                </span>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Last Update</div>
              <div className="flex items-center justify-center space-x-1">
                <Clock className="h-4 w-4" />
                <span className="font-semibold text-lg">
                  {lastUpdateTime ? `${Math.round((Date.now() - lastUpdateTime.getTime()) / 1000)}s ago` : '--'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tracking Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Total Points</div>
            <div className="font-semibold">{gpsStats.totalPoints}</div>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Distance</div>
            <div className="font-semibold">{gpsStats.totalDistance.toFixed(1)} km</div>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Top Speed</div>
            <div className="font-semibold">{Math.round(gpsStats.topSpeed)} mph</div>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Duration</div>
            <div className="font-semibold">
              {Math.floor(gpsStats.trackingDuration / 60)}:{Math.floor(gpsStats.trackingDuration % 60).toString().padStart(2, '0')}
            </div>
          </div>
        </div>

        {/* Signal Quality */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Signal Quality</span>
            <span className="capitalize">{gpsStats.signalStrength}</span>
          </div>
          <Progress value={getSignalStrengthValue()} className="h-2" />
          <div className="text-xs text-muted-foreground">
            Average accuracy: ±{gpsStats.averageAccuracy.toFixed(1)}m
          </div>
        </div>

        {/* Battery Status */}
        {currentLocation?.batteryLevel && (
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <Battery className="h-4 w-4" />
              <span className="text-sm">Device Battery</span>
            </div>
            <div className="flex items-center space-x-2">
              <Progress value={currentLocation.batteryLevel} className="w-16 h-2" />
              <span className="text-sm font-medium">{currentLocation.batteryLevel}%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default EnhancedGPSTracker;
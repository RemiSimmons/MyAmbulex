import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wifi, WifiOff, MapPin, CheckCircle, XCircle } from "lucide-react";
import { Ride } from "@shared/schema";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface LocationUpdaterProps {
  ride: Ride;
}

export default function LocationUpdater({ ride }: LocationUpdaterProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [locationUpdateInterval, setLocationUpdateInterval] = useState<NodeJS.Timeout | null>(null);
  const [automaticUpdates, setAutomaticUpdates] = useState(true);
  const [lastLocation, setLastLocation] = useState<{lat: number; lng: number} | null>(null);
  
  // Set up WebSocket connection
  useEffect(() => {
    if (!user || !ride) return;
    
    // Initialize WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;
    
    // Handle WebSocket events
    socket.onopen = () => {
      console.log('WebSocket connection established for driver');
      setWsConnected(true);
    };
    
    socket.onerror = (event) => {
      console.error('WebSocket error:', event);
      toast({
        title: "Connection Error",
        description: "Failed to establish real-time connection",
        variant: "destructive"
      });
      setWsConnected(false);
    };
    
    socket.onclose = () => {
      console.log('WebSocket connection closed');
      setWsConnected(false);
      // Stop tracking if WebSocket disconnects
      setIsTracking(false);
    };
    
    // Clean up WebSocket connection on unmount
    return () => {
      stopTracking();
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
      wsRef.current = null;
    };
  }, [user, ride]);
  
  // Start location tracking
  const startTracking = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast({
        title: "Connection Error",
        description: "Can't start tracking: no connection available",
        variant: "destructive"
      });
      return;
    }
    
    // Send start tracking message
    const startTrackingMessage = {
      type: 'start_tracking',
      role: 'driver',
      userId: user?.id,
      rideId: ride.id
    };
    
    wsRef.current.send(JSON.stringify(startTrackingMessage));
    setIsTracking(true);
    
    // Get initial location if possible
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const initialLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setLastLocation(initialLocation);
        sendLocationUpdate(initialLocation);
      },
      (error) => {
        console.error('Error getting geolocation:', error);
        // If we can't get the location, use the pickup location with a small offset
        if (ride.pickupLocationLat && ride.pickupLocationLng) {
          const fallbackLocation = {
            lat: ride.pickupLocationLat + (Math.random() * 0.002 - 0.001),
            lng: ride.pickupLocationLng + (Math.random() * 0.002 - 0.001)
          };
          setLastLocation(fallbackLocation);
          sendLocationUpdate(fallbackLocation);
        }
      }
    );
    
    // If automatic updates are enabled, set up interval
    if (automaticUpdates && !locationUpdateInterval) {
      const interval = setInterval(() => {
        updateLocation();
      }, 10000); // Update every 10 seconds
      
      setLocationUpdateInterval(interval);
    }
    
    toast({
      title: "Location Tracking Started",
      description: "Your location is now being shared with the rider",
    });
  };
  
  // Stop location tracking
  const stopTracking = () => {
    // Clear the location update interval
    if (locationUpdateInterval) {
      clearInterval(locationUpdateInterval);
      setLocationUpdateInterval(null);
    }
    
    // Send stop tracking message if WebSocket is connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && isTracking) {
      const stopTrackingMessage = {
        type: 'stop_tracking',
        role: 'driver',
        userId: user?.id,
        rideId: ride.id
      };
      
      wsRef.current.send(JSON.stringify(stopTrackingMessage));
    }
    
    setIsTracking(false);
    
    toast({
      title: "Location Tracking Stopped",
      description: "Your location is no longer being shared",
    });
  };
  
  // Toggle automatic location updates
  const toggleAutomaticUpdates = () => {
    setAutomaticUpdates(!automaticUpdates);
    
    if (!automaticUpdates && isTracking) {
      // Turn on automatic updates
      const interval = setInterval(() => {
        updateLocation();
      }, 10000); // Update every 10 seconds
      
      setLocationUpdateInterval(interval);
    } else if (automaticUpdates && locationUpdateInterval) {
      // Turn off automatic updates
      clearInterval(locationUpdateInterval);
      setLocationUpdateInterval(null);
    }
  };
  
  // Update location manually or automatically
  const updateLocation = () => {
    if (!isTracking || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    // Try to get current geolocation
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setLastLocation(currentLocation);
        sendLocationUpdate(currentLocation);
      },
      (error) => {
        console.error('Error getting geolocation:', error);
        
        // If we can't get the location, simulate movement from last known location
        if (lastLocation) {
          // Move slightly toward the destination
          let movementLat = 0;
          let movementLng = 0;
          
          if (ride.status === "en_route" && ride.pickupLocationLat && ride.pickupLocationLng) {
            // Move toward pickup location
            movementLat = (ride.pickupLocationLat - lastLocation.lat) * 0.05;
            movementLng = (ride.pickupLocationLng - lastLocation.lng) * 0.05;
          } else if (ride.status === "in_progress" && ride.dropoffLocationLat && ride.dropoffLocationLng) {
            // Move toward dropoff location
            movementLat = (ride.dropoffLocationLat - lastLocation.lat) * 0.05;
            movementLng = (ride.dropoffLocationLng - lastLocation.lng) * 0.05;
          }
          
          // Add some randomness
          movementLat += (Math.random() * 0.0004 - 0.0002);
          movementLng += (Math.random() * 0.0004 - 0.0002);
          
          const newLocation = {
            lat: lastLocation.lat + movementLat,
            lng: lastLocation.lng + movementLng
          };
          
          setLastLocation(newLocation);
          sendLocationUpdate(newLocation);
        }
      }
    );
  };
  
  // Send location update through WebSocket
  const sendLocationUpdate = (location: { lat: number; lng: number }) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    const locationUpdateMessage = {
      type: 'location_update',
      driverId: user?.id,
      rideId: ride.id,
      location: {
        ...location,
        timestamp: new Date()
      }
    };
    
    wsRef.current.send(JSON.stringify(locationUpdateMessage));
    console.log('Location update sent:', locationUpdateMessage);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>
            <MapPin className="inline-block mr-2 h-5 w-5 text-primary" />
            Location Sharing
          </span>
          {wsConnected ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
              <Wifi className="h-3.5 w-3.5" />
              Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
              <WifiOff className="h-3.5 w-3.5" />
              Disconnected
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Share your real-time location with the rider so they can track your arrival.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-4">
            <Switch 
              id="automatic-updates"
              checked={automaticUpdates}
              onCheckedChange={toggleAutomaticUpdates}
              disabled={!wsConnected}
            />
            <Label htmlFor="automatic-updates">Automatic updates every 10 seconds</Label>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">Status:</span>
            {isTracking ? (
              <span className="flex items-center text-green-600">
                <CheckCircle className="h-4 w-4 mr-1" />
                Actively sharing location
              </span>
            ) : (
              <span className="flex items-center text-gray-500">
                <XCircle className="h-4 w-4 mr-1" />
                Not sharing location
              </span>
            )}
          </div>
          
          {lastLocation && (
            <div className="mt-2 text-sm text-gray-600">
              <span className="font-medium">Current coordinates:</span>
              <code className="ml-2 px-1 py-0.5 bg-gray-100 rounded text-xs">{lastLocation.lat.toFixed(6)}, {lastLocation.lng.toFixed(6)}</code>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        {isTracking ? (
          <Button 
            variant="destructive" 
            onClick={stopTracking} 
            className="w-full"
          >
            Stop Sharing Location
          </Button>
        ) : (
          <Button 
            variant="default" 
            onClick={startTracking} 
            disabled={!wsConnected} 
            className="w-full"
          >
            {!wsConnected ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Waiting for connection...
              </>
            ) : (
              'Start Sharing Location'
            )}
          </Button>
        )}
        
        {isTracking && !automaticUpdates && (
          <Button 
            variant="outline" 
            onClick={updateLocation} 
            className="whitespace-nowrap"
          >
            Update Now
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
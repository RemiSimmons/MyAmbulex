import React, { useEffect, useRef, useState, useCallback } from "react";
// WebSocket removed - using polling system
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/utils";
import {
  Car,
  Navigation,
  MapPin,
  Home,
  Building,
  Clock,
  Info,
  AlertTriangle,
  CheckCircle2,
  MoreHorizontal,
  RefreshCw
} from "lucide-react";
import useGoogleMaps from "@/hooks/use-google-maps";

interface RideTrackingMapProps {
  rideId: number;
  pickupAddress: string;
  dropoffAddress: string;
  driverId?: number;
  driverName?: string;
  rideStatus: string;
  scheduledTime: Date;
  className?: string;
}

interface DriverLocation {
  lat: number;
  lng: number;
  heading: number;
  timestamp: Date;
  speed: number;
}

const INACTIVE_STATUSES = ['cancelled', 'completed', 'draft', 'bidding'];

const RideTrackingMap: React.FC<RideTrackingMapProps> = ({
  rideId,
  pickupAddress,
  dropoffAddress,
  driverId,
  driverName,
  rideStatus,
  scheduledTime,
  className
}) => {
  const { socket, subscribe, unsubscribe } = useWebSocket();
  const { isLoaded, google } = useGoogleMaps();
  
  // Refs for Google Maps objects
  const mapRef = useRef<google.maps.Map | null>(null);
  const pickupMarkerRef = useRef<google.maps.Marker | null>(null);
  const dropoffMarkerRef = useRef<google.maps.Marker | null>(null);
  const driverMarkerRef = useRef<google.maps.Marker | null>(null);
  const toPickupRouteRef = useRef<google.maps.Polyline | null>(null);
  const toDestinationRouteRef = useRef<google.maps.Polyline | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  // State for coordinate data
  const [pickupCoords, setPickupCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estimatedTimeToPickup, setEstimatedTimeToPickup] = useState<string | null>(null);
  const [estimatedTimeToDropoff, setEstimatedTimeToDropoff] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  
  // Initialize the map once Google Maps is loaded
  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current) return;
    
    // Create the map
    mapRef.current = new google.maps.Map(mapContainerRef.current, {
      center: { lat: 33.749, lng: -84.388 }, // Atlanta as default center
      zoom: 12,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_BOTTOM
      },
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }]
        }
      ]
    });
    
    // Create markers (initially invisible)
    pickupMarkerRef.current = new google.maps.Marker({
      position: null,
      map: mapRef.current,
      visible: false,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: "#22c55e", // Green
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: "#ffffff",
        scale: 10
      },
      label: {
        text: "P",
        color: "#ffffff",
        fontWeight: "bold",
        fontSize: "12px"
      },
      title: "Pickup Location"
    });
    
    dropoffMarkerRef.current = new google.maps.Marker({
      position: null,
      map: mapRef.current,
      visible: false,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: "#ef4444", // Red
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: "#ffffff",
        scale: 10
      },
      label: {
        text: "D",
        color: "#ffffff",
        fontWeight: "bold",
        fontSize: "12px"
      },
      title: "Dropoff Location"
    });
    
    // Now geocode addresses to get coordinates
    geocodeAddresses();
  }, [isLoaded]);
  
  // Geocode pickup and dropoff addresses
  const geocodeAddresses = async () => {
    if (!isLoaded || !google) {
      setError("Maps API not loaded");
      return;
    }
    
    try {
      setIsRouteLoading(true);
      setError(null);
      
      // Geocode pickup address
      const pickupResult = await google.geocodeAddress(pickupAddress);
      setPickupCoords(pickupResult);
      
      if (pickupMarkerRef.current && pickupResult) {
        pickupMarkerRef.current.setPosition(pickupResult);
        pickupMarkerRef.current.setVisible(true);
      }
      
      // Geocode dropoff address
      const dropoffResult = await google.geocodeAddress(dropoffAddress);
      setDropoffCoords(dropoffResult);
      
      if (dropoffMarkerRef.current && dropoffResult) {
        dropoffMarkerRef.current.setPosition(dropoffResult);
        dropoffMarkerRef.current.setVisible(true);
      }
      
      // If we have both coordinates, fit bounds to show both points
      if (pickupResult && dropoffResult && mapRef.current) {
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(pickupResult);
        bounds.extend(dropoffResult);
        mapRef.current.fitBounds(bounds, 50); // 50px padding
        
        // Get the route between pickup and dropoff
        const pickupToDropoffPath = await google.getDirections(
          pickupResult,
          dropoffResult
        );
        
        if (toDestinationRouteRef.current) {
          toDestinationRouteRef.current.setMap(null);
        }
        
        toDestinationRouteRef.current = new google.maps.Polyline({
          path: pickupToDropoffPath,
          geodesic: true,
          strokeColor: "#9ca3af", // Gray
          strokeOpacity: 0.6,
          strokeWeight: 4,
          map: mapRef.current
        });
      }
      
      setIsRouteLoading(false);
      setIsInitialLoad(false);
    } catch (err) {
      console.error("Error geocoding addresses:", err);
      setError("Could not find addresses on map");
      setIsRouteLoading(false);
      setIsInitialLoad(false);
    }
  };
  
  // Update the route from driver to pickup
  const updateDriverToPickupRoute = async (driverLoc: DriverLocation) => {
    if (!isLoaded || !google || !pickupCoords || !mapRef.current) return;
    
    try {
      // Calculate the route from driver to pickup
      const driverToPickupPath = await google.getDirections(
        { lat: driverLoc.lat, lng: driverLoc.lng },
        pickupCoords
      );
      
      // Calculate estimated time to pickup (assuming 25mph average speed)
      // A very rough estimate based on route distance
      // For a real app, you'd use the DirectionsService response data
      const estimateMinutes = Math.round(
        (google.maps.geometry.spherical.computeLength(driverToPickupPath) / 1609.34) / (driverLoc.speed / 60)
      );
      
      setEstimatedTimeToPickup(
        estimateMinutes <= 1 
          ? "Less than a minute" 
          : `~${estimateMinutes} minutes`
      );
      
      // Draw route
      if (toPickupRouteRef.current) {
        toPickupRouteRef.current.setMap(null);
      }
      
      toPickupRouteRef.current = new google.maps.Polyline({
        path: driverToPickupPath,
        geodesic: true,
        strokeColor: "#00B2E3", // Brand color
        strokeOpacity: 1,
        strokeWeight: 5,
        map: mapRef.current
      });
      
      // Calculate progress percentage (simple estimate based on distance)
      if (rideStatus === 'en_route') {
        const totalDistance = google.maps.geometry.spherical.computeLength(driverToPickupPath);
        const progress = Math.max(0, Math.min(100, 100 - (totalDistance / 1000) * 10));
        setProgress(progress);
      }
      
    } catch (err) {
      console.error("Error calculating route from driver to pickup:", err);
    }
  };
  
  // Update the route from driver to dropoff (when ride is in progress)
  const updateDriverToDropoffRoute = async (driverLoc: DriverLocation) => {
    if (!isLoaded || !google || !dropoffCoords || !mapRef.current) return;
    
    try {
      // Calculate the route from driver to dropoff
      const driverToDropoffPath = await google.getDirections(
        { lat: driverLoc.lat, lng: driverLoc.lng },
        dropoffCoords
      );
      
      // Calculate estimated time to dropoff
      const estimateMinutes = Math.round(
        (google.maps.geometry.spherical.computeLength(driverToDropoffPath) / 1609.34) / (driverLoc.speed / 60)
      );
      
      setEstimatedTimeToDropoff(
        estimateMinutes <= 1 
          ? "Less than a minute" 
          : `~${estimateMinutes} minutes`
      );
      
      // Draw route
      if (toDestinationRouteRef.current) {
        toDestinationRouteRef.current.setMap(null);
      }
      
      toDestinationRouteRef.current = new google.maps.Polyline({
        path: driverToDropoffPath,
        geodesic: true,
        strokeColor: "#00B2E3", // Brand color
        strokeOpacity: 1,
        strokeWeight: 5,
        map: mapRef.current
      });
      
      // Calculate progress percentage
      if (rideStatus === 'in_progress') {
        const totalDistance = google.maps.geometry.spherical.computeLength(driverToDropoffPath);
        const progress = Math.max(0, Math.min(100, 100 - (totalDistance / 1000) * 10));
        setProgress(progress);
      }
      
    } catch (err) {
      console.error("Error calculating route from driver to dropoff:", err);
    }
  };
  
  // Handler for driver location updates
  const handleDriverLocationUpdate = useCallback((data: any) => {
    if (data.rideId !== rideId) return;
    
    const newLocation: DriverLocation = {
      lat: data.lat,
      lng: data.lng,
      heading: data.heading,
      timestamp: new Date(data.timestamp),
      speed: data.speed || 25 // Default to 25 mph if not provided
    };
    
    setDriverLocation(newLocation);
    setLastUpdateTime(new Date(data.timestamp));
    
    // Update driver marker on map
    if (isLoaded && google && mapRef.current) {
      if (!driverMarkerRef.current) {
        driverMarkerRef.current = new google.maps.Marker({
          position: { lat: data.lat, lng: data.lng },
          map: mapRef.current,
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: "#00B2E3", // Brand color
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#ffffff",
            rotation: data.heading || 0
          },
          title: driverName || "Driver"
        });
      } else {
        driverMarkerRef.current.setPosition({ lat: data.lat, lng: data.lng });
        
        // Update the icon rotation to match heading
        const icon = driverMarkerRef.current.getIcon() as google.maps.Symbol;
        if (icon) {
          icon.rotation = data.heading || 0;
          driverMarkerRef.current.setIcon(icon);
        }
      }
      
      // Update routes based on ride status
      if (rideStatus === 'en_route' && pickupCoords) {
        updateDriverToPickupRoute(newLocation);
      } else if (rideStatus === 'in_progress' && dropoffCoords) {
        updateDriverToDropoffRoute(newLocation);
      }
      
      // Pan map to keep driver in view
      if (mapRef.current) {
        mapRef.current.panTo({ lat: data.lat, lng: data.lng });
      }
    }
  }, [isLoaded, google, rideId, rideStatus, pickupCoords, dropoffCoords, driverName]);
  
  // Subscribe to driver location updates
  useEffect(() => {
    if (!INACTIVE_STATUSES.includes(rideStatus) && driverId) {
      console.log(`Subscribing to driver location updates for ride ${rideId}`);
      subscribe("driver_location", handleDriverLocationUpdate);
      
      return () => {
        unsubscribe("driver_location", handleDriverLocationUpdate);
      };
    }
  }, [rideId, driverId, rideStatus, subscribe, unsubscribe, handleDriverLocationUpdate]);
  
  // Effect to recalculate routes if driver location changes
  useEffect(() => {
    if (driverLocation && pickupCoords && rideStatus === 'en_route') {
      updateDriverToPickupRoute(driverLocation);
    } else if (driverLocation && dropoffCoords && rideStatus === 'in_progress') {
      updateDriverToDropoffRoute(driverLocation);
    }
  }, [driverLocation, pickupCoords, dropoffCoords, rideStatus]);
  
  // Effect to update the progress bar
  useEffect(() => {
    if (rideStatus === 'en_route' && !driverLocation) {
      // Driver on way to pickup but no location yet
      setProgress(25);
    } else if (rideStatus === 'arrived') {
      // Driver at pickup
      setProgress(50);
    } else if (rideStatus === 'in_progress' && !driverLocation) {
      // Ride in progress but no location updates
      setProgress(75);
    } else if (rideStatus === 'completed') {
      // Ride completed
      setProgress(100);
    }
  }, [rideStatus, driverLocation]);
  
  // Handle refresh button - manually trigger geocoding again
  const handleRefresh = () => {
    geocodeAddresses();
  };
  
  // Get status text and color
  const getStatusInfo = () => {
    const statusMap: Record<string, { text: string, color: string }> = {
      scheduled: { 
        text: "Scheduled", 
        color: "bg-blue-500"
      },
      en_route: { 
        text: "Driver En Route", 
        color: "bg-yellow-500"
      },
      arrived: { 
        text: "Driver Arrived", 
        color: "bg-green-500"
      },
      in_progress: { 
        text: "Ride In Progress", 
        color: "bg-blue-600"
      },
      completed: { 
        text: "Ride Completed", 
        color: "bg-green-600"
      },
      cancelled: { 
        text: "Cancelled", 
        color: "bg-red-500"
      },
      bidding: { 
        text: "Bidding", 
        color: "bg-purple-500"
      },
      draft: { 
        text: "Draft", 
        color: "bg-gray-500"
      }
    };
    
    return statusMap[rideStatus] || { text: "Unknown", color: "bg-gray-500" };
  };
  
  // Calculate time since last update
  const getTimeSinceUpdate = () => {
    if (!lastUpdateTime) return null;
    
    const diffMs = new Date().getTime() - lastUpdateTime.getTime();
    const diffSec = Math.round(diffMs / 1000);
    
    if (diffSec < 60) {
      return `${diffSec} sec ago`;
    } else if (diffSec < 3600) {
      return `${Math.round(diffSec / 60)} min ago`;
    } else {
      return `${Math.round(diffSec / 3600)} hr ago`;
    }
  };
  
  const { text: statusText, color: statusColor } = getStatusInfo();
  const timeSinceUpdate = getTimeSinceUpdate();
  
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Live Ride Tracking</CardTitle>
          
          <div className="flex items-center space-x-2">
            <Badge variant={INACTIVE_STATUSES.includes(rideStatus) ? "outline" : "default"} className={`${statusColor} text-white`}>
              {statusText}
            </Badge>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleRefresh}
                  disabled={isRouteLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isRouteLoading ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh map</TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        <CardDescription>
          {scheduledTime && (
            <div className="flex items-center mt-1 text-sm">
              <Clock className="h-4 w-4 mr-1" />
              Scheduled pickup: {formatDate(scheduledTime, "datetime")}
            </div>
          )}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-0 relative">
        {/* Progress bar at top of map */}
        {!INACTIVE_STATUSES.includes(rideStatus) && (
          <div className="px-6 pb-2">
            <Progress value={progress} className="h-2" />
          </div>
        )}
        
        {/* Map container */}
        <div 
          ref={mapContainerRef} 
          className="w-full h-[400px] relative bg-gray-100"
        >
          {/* Loading overlay */}
          {(isInitialLoad || isRouteLoading) && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-10">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              <div className="mt-4 text-sm text-muted-foreground">Loading map data...</div>
            </div>
          )}
          
          {/* Error overlay */}
          {error && (
            <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center z-10 p-4">
              <AlertTriangle className="h-10 w-10 text-warning mb-2" />
              <div className="text-lg font-medium">Map Error</div>
              <div className="text-sm text-muted-foreground text-center mt-1">{error}</div>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={handleRefresh}
              >
                <RefreshCw className="h-4 w-4 mr-2" /> Try Again
              </Button>
            </div>
          )}
          
          {/* Status badge for updates while ride is active */}
          {driverLocation && !INACTIVE_STATUSES.includes(rideStatus) && (
            <div className="absolute top-3 left-3 z-20">
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Badge variant="warning" className="flex items-center gap-1.5 cursor-help">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Live tracking {timeSinceUpdate && `(Updated ${timeSinceUpdate})`}
                  </Badge>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold">Live Driver Updates</h4>
                    <div className="text-sm">
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Location</span>
                        <span>{driverLocation.lat.toFixed(5)}, {driverLocation.lng.toFixed(5)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Speed</span>
                        <span>{driverLocation.speed} mph</span>
                      </div>
                      {estimatedTimeToPickup && rideStatus === 'en_route' && (
                        <div className="flex justify-between py-1">
                          <span className="text-muted-foreground">Est. time to pickup</span>
                          <span>{estimatedTimeToPickup}</span>
                        </div>
                      )}
                      {estimatedTimeToDropoff && rideStatus === 'in_progress' && (
                        <div className="flex justify-between py-1">
                          <span className="text-muted-foreground">Est. time to destination</span>
                          <span>{estimatedTimeToDropoff}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Last update</span>
                        <span>{lastUpdateTime ? formatDate(lastUpdateTime, "time") : "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>
          )}
          
          {/* No driver message */}
          {!driverLocation && !INACTIVE_STATUSES.includes(rideStatus) && rideStatus !== 'scheduled' && (
            <div className="absolute top-3 left-3 z-20">
              <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 border-yellow-500">
                Waiting for driver location...
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-col items-stretch px-6 py-3 space-y-2">
        <div className="flex items-center text-sm">
          <MapPin className="h-4 w-4 mr-2 text-green-600" />
          <span className="font-medium mr-1">Pickup:</span> 
          <span className="text-muted-foreground truncate">{pickupAddress}</span>
        </div>
        
        <div className="flex items-center text-sm">
          <MapPin className="h-4 w-4 mr-2 text-red-600" />
          <span className="font-medium mr-1">Dropoff:</span> 
          <span className="text-muted-foreground truncate">{dropoffAddress}</span>
        </div>
      </CardFooter>
    </Card>
  );
};

export default RideTrackingMap;
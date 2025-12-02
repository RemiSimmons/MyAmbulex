import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Loader, AlertCircle } from "lucide-react";
import { loadGoogleMapsApi } from "@/lib/google-maps-singleton";

// Define utility functions locally if they're not available from googleMaps.ts
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDuration(minutes: number): string {
  if (minutes < 1) {
    return "less than a minute";
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  
  if (hours === 0) {
    return `${mins} min${mins !== 1 ? 's' : ''}`;
  } else if (mins === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else {
    return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
  }
}

// Add Google Maps types for TypeScript
type GoogleMap = any;
type DirectionsRenderer = any;
type DirectionsResult = any;
type DirectionsStatus = any;

interface MapLocation {
  lat: number;
  lng: number;
  label?: string;
}

interface RouteInfo {
  distance: string;
  duration: string;
  optimizedWaypoints?: boolean;
}

interface MapViewProps {
  pickupLocation?: MapLocation;
  dropoffLocation?: MapLocation;
  currentLocation?: MapLocation;
  className?: string;
  id?: string;
  onRouteCalculated?: (routeInfo: RouteInfo) => void;
  onError?: (error: string) => void;
}

export default function MapView({
  pickupLocation,
  dropoffLocation,
  currentLocation,
  className = "h-48 rounded-lg",
  id,
  onRouteCalculated,
  onError
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState<GoogleMap | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<DirectionsRenderer | null>(null);
  
  // Using refs to avoid state updates that cause re-renders
  const attemptedDirectionsRef = useRef(false);
  const mapBoundsRef = useRef<any>(null);
  
  // State to track API quota errors
  const [hasQuotaError, setHasQuotaError] = useState(false);
  
  // Validate that coordinates are actually numbers and not null
  const isValidLocation = useCallback((loc: any): boolean => {
    return loc && 
      typeof loc?.lat === 'number' && 
      typeof loc?.lng === 'number' && 
      !isNaN(loc?.lat) && 
      !isNaN(loc?.lng);
  }, []);
  
  // Create stable string representations of coordinates for dependencies
  const pickupStr = useMemo(() => {
    return isValidLocation(pickupLocation) ? `${pickupLocation?.lat},${pickupLocation?.lng}` : '';
  }, [pickupLocation, isValidLocation]);
  
  const dropoffStr = useMemo(() => {
    return isValidLocation(dropoffLocation) ? `${dropoffLocation?.lat},${dropoffLocation?.lng}` : '';
  }, [dropoffLocation, isValidLocation]);
  
  const currentStr = useMemo(() => {
    return isValidLocation(currentLocation) ? `${currentLocation?.lat},${currentLocation?.lng}` : '';
  }, [currentLocation, isValidLocation]);
  
  // Helper function to provide fallback route calculation
  const provideFallbackRouteCalculation = useCallback(() => {
    if (!pickupLocation || !dropoffLocation || !onRouteCalculated) return;
    
    // Make sure we have valid coordinates
    if (!isValidLocation(pickupLocation) || !isValidLocation(dropoffLocation)) {
      console.warn("Cannot calculate distance with invalid coordinates:", { pickupLocation, dropoffLocation });
      
      // Provide a generic response since we can't calculate
      onRouteCalculated({
        distance: "Distance unavailable",
        duration: "Duration unavailable",
        optimizedWaypoints: false
      });
      return;
    }
    
    try {
      // Use the calculateDistance utility function
      const distanceMiles = calculateDistance(
        pickupLocation.lat,
        pickupLocation.lng,
        dropoffLocation.lat,
        dropoffLocation.lng
      );
      
      // Estimate duration (assuming ~30mph)
      const durationMinutes = Math.round((distanceMiles / 30) * 60);
      
      // Format using the formatDuration utility
      const formattedDuration = formatDuration(durationMinutes);
      
      onRouteCalculated({
        distance: `~${distanceMiles.toFixed(1)} mi`,
        duration: formattedDuration,
        optimizedWaypoints: false
      });
    } catch (error) {
      console.error("Error in fallback route calculation:", error);
      onRouteCalculated({
        distance: "Distance unavailable",
        duration: "Duration unavailable",
        optimizedWaypoints: false
      });
    }
  }, [pickupLocation, dropoffLocation, onRouteCalculated, isValidLocation]);
  
  // Load Google Maps API using the centralized utility
  useEffect(() => {
    const initGoogleMaps = async () => {
      try {
        await loadGoogleMapsApi();
        setMapLoaded(true);
        
        // Add a global error handler for Maps API errors
        const handleMapsError = (event: ErrorEvent) => {
          if (event.message && event.message.includes('Google Maps JavaScript API error: OverQuotaMapError')) {
            console.warn("Google Maps API quota exceeded - switching to fallback mode");
            setHasQuotaError(true);
            if (onError) {
              onError("Maps service temporarily unavailable. Using estimated distances.");
            }
          }
        };
        
        window.addEventListener('error', handleMapsError);
        return () => window.removeEventListener('error', handleMapsError);
      } catch (error) {
        console.error("Failed to load Google Maps API:", error);
        if (onError) {
          onError("Unable to load map services. Using estimated distances instead.");
        }
      }
    };
    
    initGoogleMaps();
  }, [onError]);

  // Initialize the map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    try {
      // Default coordinates (center of the United States)
      const defaultCenter = { lat: 40.7128, lng: -74.0060 };
      
      // Determine center point - use pickup location if available
      let center = defaultCenter;
      if (isValidLocation(pickupLocation)) {
        center = { 
          lat: pickupLocation?.lat || defaultCenter.lat, 
          lng: pickupLocation?.lng || defaultCenter.lng 
        };
      }
      
      // Create the map with error handling
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 12,
        center: center,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_BOTTOM
        }
      });
      
      // Force the map to resize after creation to ensure proper display
      setTimeout(() => {
        if (map && window.google.maps.event) {
          window.google.maps.event.trigger(map, 'resize');
        }
      }, 200);
      
      // Create the directions renderer with error handling
      const renderer = new window.google.maps.DirectionsRenderer({
        map,
        suppressMarkers: true, // We'll add our own markers
        polylineOptions: {
          strokeColor: '#00B2E3', // MyAmbulex brand color
          strokeWeight: 5,
          strokeOpacity: 0.8
        }
      });
      
      // Add event listener for errors
      map.addListener('error', (e: any) => {
        console.error("Map error event:", e);
      });

      setMapInstance(map);
      setDirectionsRenderer(renderer);
    } catch (error) {
      console.error("Error initializing Google Maps:", error);
      if (onError) {
        onError("Unable to initialize map. Please try refreshing the page.");
      }
    }
  }, [mapLoaded, isValidLocation, pickupLocation, onError]);
  
  // Log location data for debugging - only when coordinates actually change
  useEffect(() => {
    if (pickupStr || dropoffStr) {
      console.log("MapView locations:", { 
        pickup: pickupLocation, 
        dropoff: dropoffLocation,
        isValidPickup: isValidLocation(pickupLocation),
        isValidDropoff: isValidLocation(dropoffLocation)
      });
    }
  }, [pickupStr, dropoffStr, pickupLocation, dropoffLocation, isValidLocation]);
  
  // Update the map markers and route
  useEffect(() => {
    // Skip if map isn't loaded
    if (!mapInstance || !mapLoaded) return;
    
    // Check if we need to use fallback calculation
    if (hasQuotaError) {
      if (pickupLocation && dropoffLocation && onRouteCalculated && !attemptedDirectionsRef.current) {
        attemptedDirectionsRef.current = true;
        provideFallbackRouteCalculation();
      }
      return;
    }
    
    // Clear previous markers
    const existingMarkers = mapInstance.get("markers") || [];
    existingMarkers.forEach((marker: any) => marker.setMap(null));
    mapInstance.set("markers", []);
    
    // Create a new bounds object
    const bounds = new window.google.maps.LatLngBounds();
    const markers: any[] = [];
    
    // Add pickup marker if coordinates are valid
    if (isValidLocation(pickupLocation)) {
      const pickupMarker = new window.google.maps.Marker({
        position: pickupLocation,
        map: mapInstance,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#3B82F6', // Blue
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        title: pickupLocation!.label || 'Pickup'
      });
      markers.push(pickupMarker);
      bounds.extend(pickupMarker.getPosition()!);
    }
    
    // Add dropoff marker if coordinates are valid
    if (isValidLocation(dropoffLocation)) {
      const dropoffMarker = new window.google.maps.Marker({
        position: dropoffLocation,
        map: mapInstance,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#EF4444', // Red
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        title: dropoffLocation!.label || 'Dropoff'
      });
      markers.push(dropoffMarker);
      bounds.extend(dropoffMarker.getPosition()!);
    }
    
    // Add current location marker if coordinates are valid
    if (isValidLocation(currentLocation)) {
      const currentMarker = new window.google.maps.Marker({
        position: currentLocation,
        map: mapInstance,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#F59E0B', // Amber
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        title: currentLocation!.label || 'Current Location',
        zIndex: 10
      });
      markers.push(currentMarker);
      bounds.extend(currentMarker.getPosition()!);
    }
    
    // Store markers for later cleanup
    mapInstance.set("markers", markers);
    
    // Fit bounds if we have at least one valid point
    if (markers.length > 0 && !bounds.isEmpty()) {
      try {
        // Only update bounds if they've changed to prevent flicker
        const boundsStr = bounds.toString();
        if (mapBoundsRef.current !== boundsStr) {
          mapBoundsRef.current = boundsStr;
          mapInstance.fitBounds(bounds);
          
          // If we have only one point, zoom in more
          if (markers.length === 1) {
            mapInstance.setZoom(14);
          }
        }
      } catch (error) {
        console.warn("Error fitting map bounds:", error);
      }
    }
    
    // Calculate route if we have both pickup and dropoff
    const hasValidPickup = isValidLocation(pickupLocation);
    const hasValidDropoff = isValidLocation(dropoffLocation);
    
    // Only calculate directions if we haven't already done so for these coordinates
    // This prevents excessive API calls and flickering
    if (directionsRenderer && hasValidPickup && hasValidDropoff && !attemptedDirectionsRef.current) {
      attemptedDirectionsRef.current = true;
      
      try {
        const directionsService = new window.google.maps.DirectionsService();
        directionsService.route({
          origin: pickupLocation!,
          destination: dropoffLocation!,
          travelMode: window.google.maps.TravelMode.DRIVING,
          provideRouteAlternatives: false,
        }, (result: DirectionsResult, status: DirectionsStatus) => {
          if (status === window.google.maps.DirectionsStatus.OK && result && directionsRenderer) {
            directionsRenderer.setDirections(result);
            
            // Extract route information for the parent component
            if (onRouteCalculated && result.routes && result.routes.length > 0) {
              const route = result.routes[0];
              if (route && route.legs && route.legs.length > 0) {
                const leg = route.legs[0];
                
                onRouteCalculated({
                  distance: leg.distance?.text || 'Unknown distance',
                  duration: leg.duration?.text || 'Unknown duration',
                  optimizedWaypoints: false
                });
              }
            }
          } else {
            console.warn("Directions request failed:", status);
            
            if (onError) {
              let errorMessage = "Could not calculate route";
              
              // Provide more specific error messages based on status
              if (status === window.google.maps.DirectionsStatus.ZERO_RESULTS) {
                errorMessage = "No route found between these locations";
              } else if (status === window.google.maps.DirectionsStatus.OVER_QUERY_LIMIT) {
                errorMessage = "Maps service temporarily unavailable. Using estimated distances.";
                setHasQuotaError(true);
              }
              
              onError(errorMessage);
            }
            
            // Use fallback calculation if directions API fails
            provideFallbackRouteCalculation();
          }
        });
      } catch (error) {
        console.error("Error requesting directions:", error);
        if (onError) onError("Error calculating route");
        provideFallbackRouteCalculation();
      }
    }
    // If we have changed locations, reset the directions attempted flag
    else if ((!hasValidPickup || !hasValidDropoff) && attemptedDirectionsRef.current) {
      attemptedDirectionsRef.current = false;
      if (directionsRenderer) {
        directionsRenderer.setDirections({ routes: [] });
      }
    }
  }, [pickupStr, dropoffStr, currentStr, mapInstance, directionsRenderer, mapLoaded, provideFallbackRouteCalculation, hasQuotaError, isValidLocation, onRouteCalculated, onError, pickupLocation, dropoffLocation, currentLocation]);
  
  // Handle quota errors with a friendly message
  if (hasQuotaError) {
    return (
      <div id={id} className={`${className} flex items-center justify-center bg-amber-50 border border-amber-200`}>
        <div className="text-center">
          <AlertCircle className="h-6 w-6 text-amber-500 mx-auto mb-2" />
          <p className="text-sm text-amber-700 font-medium">Map temporarily unavailable</p>
          <p className="text-xs text-amber-600 mt-1">Using estimated distances instead</p>
        </div>
      </div>
    );
  }
  
  if (!mapLoaded) {
    return (
      <div id={id} className={`${className} flex items-center justify-center bg-muted`}>
        <div className="text-center">
          <Loader className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      id={id}
      ref={mapRef} 
      className={`${className} relative overflow-hidden bg-muted`}
      aria-label="Map showing ride route"
    />
  );
}
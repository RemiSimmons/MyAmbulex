import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Clock, MapPin, Route, Car, AlertCircle } from "lucide-react";
import MapView from "@/components/map-view";
import { Button } from "@/components/ui/button";
import { cleanAddress } from "@/lib/utils";
// Simple error boundary component
// Using local utility functions instead of importing from removed googleMaps
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
  if (minutes < 1) return "less than a minute";
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}
import { CoordinateValidator } from "@shared/coordinate-validator";
import { BackupFareCalculator } from "@shared/backup-fare-calculator";

interface RoutePreviewProps {
  pickupLocation?: {
    lat: number;
    lng: number;
    address: string;
  };
  dropoffLocation?: {
    lat: number;
    lng: number;
    address: string;
  };
  onRouteCalculated?: (routeInfo: {
    distance: string;
    duration: string;
    optimizedWaypoints?: boolean;
  }) => void;
  distance?: string;
  duration?: string;
  vehicleType?: string;
  fare?: number;
  isRoundTrip?: boolean;
  className?: string;
}

export default function RoutePreview({
  pickupLocation,
  dropoffLocation,
  onRouteCalculated,
  distance,
  duration,
  vehicleType = "standard",
  fare = 0,
  isRoundTrip = false,
  className = "",
}: RoutePreviewProps) {
  const [showMap, setShowMap] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [hasCalculatedFallbackRoute, setHasCalculatedFallbackRoute] = useState(false);
  const [routeGenerationAttempted, setRouteGenerationAttempted] = useState(false);
  
  // Check if both locations are valid with numeric coordinates (not null)
  const isValidLocation = (loc: any): boolean => {
    return loc && typeof loc.lat === 'number' && typeof loc.lng === 'number';
  };
  
  // Cache for geocoded addresses
  const [geocodedPickup, setGeocodedPickup] = useState<{ lat: number, lng: number } | null>(null);
  const [geocodedDropoff, setGeocodedDropoff] = useState<{ lat: number, lng: number } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  
  // Check if we have locations - either direct coordinates or geocoded ones
  const hasLocations = (isValidLocation(pickupLocation) || geocodedPickup) && 
                       (isValidLocation(dropoffLocation) || geocodedDropoff);
  
  
  // Geocode addresses when coordinates are missing
  useEffect(() => {
    const geocodeAddress = async (address: string): Promise<{ lat: number, lng: number } | null> => {
      try {
        // Try to use the browser's navigator.geolocation API as fallback
        const geocoder = new window.google.maps.Geocoder();
        
        return new Promise((resolve) => {
          geocoder.geocode({ address }, (results: any[] | null, status: any) => {
            if (status === window.google.maps.GeocoderStatus.OK && results && results.length > 0) {
              const location = results[0].geometry.location;
              resolve({ 
                lat: location.lat(), 
                lng: location.lng() 
              });
            } else {
              console.warn(`Geocoding failed for "${address}" with status: ${status}`);
              resolve(null);
            }
          });
        });
      } catch (error) {
        console.error("Error geocoding address:", error);
        return null;
      }
    };
    
    const fetchMissingCoordinates = async () => {
      if (isGeocoding) return;
      
      // Only geocode if we have map loaded and addresses but missing coordinates
      if (!window.google?.maps?.Geocoder) return;
      
      setIsGeocoding(true);
      
      // If we have address but missing coordinates for pickup
      if (pickupLocation?.address && (!isValidLocation(pickupLocation)) && !geocodedPickup) {
        console.log("Geocoding pickup address:", pickupLocation.address);
        const coords = await geocodeAddress(pickupLocation.address);
        if (coords) {
          console.log("Geocoded pickup coordinates:", coords);
          setGeocodedPickup(coords);
        }
      }
      
      // If we have address but missing coordinates for dropoff
      if (dropoffLocation?.address && (!isValidLocation(dropoffLocation)) && !geocodedDropoff) {
        console.log("Geocoding dropoff address:", dropoffLocation.address);
        const coords = await geocodeAddress(dropoffLocation.address);
        if (coords) {
          console.log("Geocoded dropoff coordinates:", coords);
          setGeocodedDropoff(coords);
        }
      }
      
      setIsGeocoding(false);
    };
    
    fetchMissingCoordinates();
  }, [pickupLocation, dropoffLocation, geocodedPickup, geocodedDropoff, isGeocoding]);
  
  // Calculate route information using fallback method
  const calculateFallbackRoute = useCallback(() => {
    if (!hasLocations || !pickupLocation || !dropoffLocation) return;
    
    // Validate coordinates before calculation
    const pickup = {
      lat: pickupLocation.lat,
      lng: pickupLocation.lng
    };
    const dropoff = {
      lat: dropoffLocation.lat,
      lng: dropoffLocation.lng
    };
    
    // Check if coordinates are valid (not NaN, not undefined, within reasonable bounds)
    // Also check for common fallback values that indicate invalid coordinates
    if (
      isNaN(pickup.lat) || isNaN(pickup.lng) || 
      isNaN(dropoff.lat) || isNaN(dropoff.lng) ||
      Math.abs(pickup.lat) > 90 || Math.abs(pickup.lng) > 180 ||
      Math.abs(dropoff.lat) > 90 || Math.abs(dropoff.lng) > 180 ||
      (pickup.lat === 1 && pickup.lng === 1) ||  // Common fallback coordinates
      (dropoff.lat === 1 && dropoff.lng === 1) ||
      (pickup.lat === 0 && pickup.lng === 0) ||  // Another common fallback
      (dropoff.lat === 0 && dropoff.lng === 0)
    ) {
      console.error("Invalid coordinates for distance calculation:", { pickup, dropoff });
      setMapError("Invalid location coordinates. Please try selecting addresses again.");
      return;
    }
    
    // Calculate straight-line distance
    const distanceMiles = calculateDistance(
      pickup.lat,
      pickup.lng,
      dropoff.lat,
      dropoff.lng
    );
    
    // Use the new coordinate validator for comprehensive validation
    const distanceResult = CoordinateValidator.calculateValidatedDistance(pickup, dropoff);
    
    if (!distanceResult.success || !distanceResult.distance) {
      console.error("Distance validation failed:", distanceResult.error);
      setMapError(CoordinateValidator.getUserFriendlyError(distanceResult.error || "Unable to calculate distance"));
      return;
    }
    
    const validatedDistance = distanceResult.distance;
    
    
    // Use backup fare calculator for duration estimation
    const formattedDuration = BackupFareCalculator.estimateDuration(validatedDistance);
    const formattedDistance = BackupFareCalculator.formatDistance(validatedDistance);
    
    if (onRouteCalculated) {
      onRouteCalculated({
        distance: formattedDistance,
        duration: formattedDuration,
        optimizedWaypoints: false
      });
      
      setHasCalculatedFallbackRoute(true);
      setMapError("Using estimated distances due to API limitations.");
    }
  }, [hasLocations, pickupLocation, dropoffLocation, onRouteCalculated]);
  
  // Calculate fallback route information when API fails or no route info is provided
  useEffect(() => {
    if (hasLocations && (!distance || !duration) && !hasCalculatedFallbackRoute && routeGenerationAttempted) {
      calculateFallbackRoute();
    }
  }, [hasLocations, distance, duration, hasCalculatedFallbackRoute, routeGenerationAttempted, calculateFallbackRoute]);
  
  // Using memoized location strings to prevent unnecessary re-renders
  const pickupStr = useMemo(() => {
    return pickupLocation ? `${pickupLocation.lat},${pickupLocation.lng}` : '';
  }, [pickupLocation]);
  
  const dropoffStr = useMemo(() => {
    return dropoffLocation ? `${dropoffLocation.lat},${dropoffLocation.lng}` : '';
  }, [dropoffLocation]);
  
  // Always show map when we have valid locations - simplified logic
  useEffect(() => {
    if (hasLocations && !showMap) {
      setShowMap(true);
    } else if (!hasLocations && showMap) {
      setShowMap(false);
    }
  }, [hasLocations, showMap]);

  // Handle route calculation errors or success
  const handleRouteCalculated = (routeInfo: {
    distance: string;
    duration: string;
    optimizedWaypoints?: boolean;
  }) => {
    setRouteGenerationAttempted(true);
    
    if (onRouteCalculated) {
      onRouteCalculated(routeInfo);
    }
  };
  
  // Handle map error
  const handleMapError = (error: string) => {
    setMapError(error);
    setRouteGenerationAttempted(true);
    calculateFallbackRoute();
  };

  if (!hasLocations) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="text-center py-8">
          <MapPin className="h-10 w-10 mx-auto mb-3 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-700">Route Preview</h3>
          <p className="text-gray-500 text-sm mt-2">
            Enter pickup and dropoff locations to see route details
          </p>
        </div>
      </Card>
    );
  }

  const getVehicleLabel = () => {
    switch (vehicleType) {
      case "wheelchair":
        return "Wheelchair Accessible";
      case "stretcher":
        return "Stretcher Transport";
      default:
        return "Standard Vehicle";
    }
  };

  return (
    <Card className={`${className}`}>
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="text-lg font-medium">Route Preview</h3>
            {mapError && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>{mapError}</span>
              </p>
            )}
          </div>

        </div>
        
        {hasLocations && showMap && (
          <div className="mb-4">
              {/* Create references to valid pickup and dropoff coordinates to avoid calculation inside JSX */}
              {(() => {
                // Prepare valid pickup coordinates
                const validPickup = isValidLocation(pickupLocation) 
                  ? { lat: pickupLocation?.lat || 0, lng: pickupLocation?.lng || 0, label: "Pickup" }
                  : (geocodedPickup ? { lat: geocodedPickup.lat, lng: geocodedPickup.lng, label: "Pickup" } : null);
                
                // Prepare valid dropoff coordinates
                const validDropoff = isValidLocation(dropoffLocation)
                  ? { lat: dropoffLocation?.lat || 0, lng: dropoffLocation?.lng || 0, label: "Destination" }
                  : (geocodedDropoff ? { lat: geocodedDropoff.lat, lng: geocodedDropoff.lng, label: "Destination" } : null);
                
                // Only render the map when both coordinates are valid to prevent flickering
                if (validPickup && validDropoff) {
                  return (
                    <MapView 
                      id="route-preview-map"
                      pickupLocation={validPickup}
                      dropoffLocation={validDropoff}
                      className="h-40 rounded-lg border border-gray-200"
                      onRouteCalculated={handleRouteCalculated}
                      onError={handleMapError}
                    />
                  );
                } else {
                  // Show loading state while coordiantes are being resolved
                  return (
                    <div className="h-40 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                        <p className="text-sm text-gray-500">Preparing map...</p>
                      </div>
                    </div>
                  );
                }
              })()}
          </div>
        )}

        <div className="space-y-3">
          {/* Only show text addresses when map is not displaying */}
          {(!hasLocations || !showMap) && (
            <>
              <div className="flex items-start gap-3">
                <div className="mt-1 text-primary">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pickup</p>
                  <p className="text-sm font-medium">{cleanAddress(pickupLocation?.address || '')}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="mt-1 text-red-500">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Destination</p>
                  <p className="text-sm font-medium">{cleanAddress(dropoffLocation?.address || '')}</p>
                </div>
              </div>
            </>
          )}
          
          <div className="border-t my-2 pt-2">
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Car className="h-3 w-3" />
                <span>{getVehicleLabel()}</span>
              </Badge>
              
              {distance && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Route className="h-3 w-3" />
                  <span>{distance}</span>
                </Badge>
              )}
              
              {duration && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{duration}</span>
                </Badge>
              )}
              
              {isRoundTrip && (
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  Round Trip
                </Badge>
              )}
            </div>
            
            {fare > 0 && (
              <div className="text-right mt-2">
                <p className="text-sm text-gray-500">Estimated fare</p>
                <p className="text-lg font-semibold">${fare.toFixed(2)}</p>
                {isRoundTrip && (
                  <p className="text-xs text-gray-400">
                    Includes return journey
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
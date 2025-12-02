import { useState, useEffect, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { useToast } from '@/hooks/use-toast';

// Check for API key
const VITE_GOOGLE_MAPS = import.meta.env.VITE_GOOGLE_MAPS;

// Interface to wrap Google Maps functionality
interface GoogleMapsInterface {
  maps: typeof google.maps;
  places: typeof google.maps.places;
  geocodeAddress: (address: string) => Promise<google.maps.LatLngLiteral>;
  getDirections: (
    origin: google.maps.LatLngLiteral,
    destination: google.maps.LatLngLiteral
  ) => Promise<google.maps.LatLngLiteral[]>;
}

// Main hook
export default function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [google, setGoogle] = useState<GoogleMapsInterface | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!VITE_GOOGLE_MAPS) {
      const error = new Error('Google Maps API key is missing');
      setLoadError(error);
      console.error(error.message);
      return;
    }

    const loader = new Loader({
      apiKey: VITE_GOOGLE_MAPS,
      version: 'weekly',
      libraries: ['places', 'geometry']
    });

    let isMounted = true;

    loader.load()
      .then((googleInstance) => {
        if (!isMounted) return;

        // Initialize the DirectionsService - this line might cause TS errors
        // but it works at runtime
        const directionsService = new googleInstance.maps.DirectionsService();

        // Create Google Maps API wrapper with convenience methods
        const googleInterface: GoogleMapsInterface = {
          maps: googleInstance.maps,
          places: googleInstance.maps.places,
          
          // Method to geocode an address string to lat/lng coordinates
          geocodeAddress: async (address: string) => {
            return new Promise<google.maps.LatLngLiteral>((resolve, reject) => {
              const geocoder = new googleInstance.maps.Geocoder();
              
              geocoder.geocode({ address }, (results, status) => {
                if (status === googleInstance.maps.GeocoderStatus.OK && results?.[0]) {
                  const location = results[0].geometry.location;
                  resolve({ lat: location.lat(), lng: location.lng() });
                } else {
                  reject(new Error(`Geocoding failed: ${status}`));
                }
              });
            });
          },
          
          // Method to get route path between two points
          getDirections: async (
            origin: google.maps.LatLngLiteral,
            destination: google.maps.LatLngLiteral
          ) => {
            return new Promise<google.maps.LatLngLiteral[]>((resolve, reject) => {
              directionsService.route(
                {
                  origin,
                  destination,
                  travelMode: googleInstance.maps.TravelMode.DRIVING
                },
                (result, status) => {
                  if (status === googleInstance.maps.DirectionsStatus.OK && result?.routes?.[0]) {
                    const route = result.routes[0];
                    const path: google.maps.LatLngLiteral[] = [];
                    
                    // Extract the path points from the route
                    if (route.overview_path) {
                      route.overview_path.forEach((point) => {
                        path.push({ lat: point.lat(), lng: point.lng() });
                      });
                    }
                    
                    resolve(path);
                  } else {
                    reject(new Error(`Directions request failed: ${status}`));
                  }
                }
              );
            });
          }
        };

        setGoogle(googleInterface);
        setIsLoaded(true);
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error('Failed to load Google Maps API:', error);
        setLoadError(error);
        toast({
          title: 'Map Error',
          description: 'Failed to load Google Maps. Please refresh the page.',
          variant: 'destructive',
        });
      });

    return () => {
      isMounted = false;
    };
  }, [toast]);

  return { isLoaded, loadError, google };
}
import { useState, useEffect, useCallback } from 'react';
import { loadGoogleMapsApi, getGoogleMapsServices, getPlacePredictions, geocodeAddress } from '@/lib/google-maps-singleton';

export interface GoogleMapsHookResult {
  isLoaded: boolean;
  isLoading: boolean;
  error: Error | null;
  getPlacePredictions: (
    input: string, 
    options?: google.maps.places.AutocompletionRequest
  ) => Promise<google.maps.places.AutocompletePrediction[]>;
  geocode: (
    request: google.maps.GeocoderRequest
  ) => Promise<google.maps.GeocoderResult[]>;
}

/**
 * Hook to use Google Maps API in React components
 */
export function useMapsApi(): GoogleMapsHookResult {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load the Maps API when the hook is first used
  useEffect(() => {
    // First check if already loaded
    const services = getGoogleMapsServices();
    
    if (services.isLoaded) {
      setIsLoaded(true);
      return;
    }
    
    if (services.error) {
      setError(services.error);
      return;
    }
    
    // Start loading if not already loaded
    setIsLoading(true);
    
    loadGoogleMapsApi()
      .then(() => {
        setIsLoaded(true);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('[useMapsApi] Error loading Maps API:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      });
  }, []);

  // Function to get place predictions
  const getPlacePredictions = useCallback(
    async (
      input: string, 
      options: google.maps.places.AutocompletionRequest = {}
    ): Promise<google.maps.places.AutocompletePrediction[]> => {
      if (!input.trim()) {
        return []; // Return empty array for empty input
      }
      
      if (!isLoaded) {
        console.warn('Maps API not loaded, returning empty predictions');
        return []; // Return empty array instead of throwing
      }
      
      const services = getGoogleMapsServices();
      
      if (!services.autocompleteService) {
        console.warn('Autocomplete service not available, returning empty predictions');
        return []; // Return empty array instead of throwing
      }
      
      return new Promise((resolve) => {
        try {
          const defaultOptions = {
            input,
            componentRestrictions: { country: 'us' }
          };
          
          const mergedOptions = { ...defaultOptions, ...options };
          
          services.autocompleteService.getPlacePredictions(
            mergedOptions,
            (results, status) => {
              if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                resolve(results);
              } else {
                // Always return empty array instead of rejecting for any error
                console.warn(`Places API returned status: ${status}`);
                resolve([]);
              }
            }
          );
        } catch (error) {
          console.error('Error in getPlacePredictions:', error);
          resolve([]); // Return empty array for any error
        }
      });
    },
    [isLoaded]
  );

  // Function to geocode addresses/places with improved error handling
  const geocode = useCallback(
    async (request: google.maps.GeocoderRequest): Promise<google.maps.GeocoderResult[]> => {
      // Handle missing address
      if (!request || (typeof request === 'object' && !request.address && !request.placeId && !request.location)) {
        console.warn('Geocode request missing required parameters');
        return [];
      }
      
      if (!isLoaded) {
        console.warn('Maps API not loaded, returning empty geocode results');
        return []; // Return empty array instead of throwing
      }
      
      const services = getGoogleMapsServices();
      
      if (!services.geocoder) {
        console.warn('Geocoder service not available, returning empty geocode results');
        return []; // Return empty array instead of throwing
      }
      
      return new Promise((resolve) => {
        try {
          services.geocoder.geocode(request, (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results) {
              // Process results to ensure address components are usable
              const processedResults = results.map(result => {
                try {
                  // Save original result
                  const processedResult = { ...result };
                  
                  // Add helper property to easily find address components
                  if (processedResult.address_components) {
                    // @ts-ignore - Adding our own property to assist with component access
                    processedResult.getAddressComponent = (type: string): string => {
                      const component = processedResult.address_components?.find(
                        c => c.types.includes(type)
                      );
                      return component ? component.long_name : '';
                    };
                  }
                  
                  return processedResult;
                } catch (err) {
                  console.error('Error processing geocode result:', err);
                  return result; // Return original result if processing fails
                }
              });
              
              resolve(processedResults);
            } else {
              // Always return empty array for any error status
              console.warn(`Geocoder returned status: ${status}`);
              resolve([]);
            }
          });
        } catch (error) {
          console.error('Error in geocode:', error);
          resolve([]); // Return empty array for any error
        }
      });
    },
    [isLoaded]
  );

  return {
    isLoaded,
    isLoading,
    error,
    getPlacePredictions,
    geocode
  };
}
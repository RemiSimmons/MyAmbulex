import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, MapPin, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  loadGoogleMapsApi, 
  getGoogleMapsServices,
  getPlacePredictions,
  geocodeAddress
} from "@/lib/google-maps-singleton";

interface LocationSearchInputProps {
  value: string;
  onChange: (address: string, lat?: number, lng?: number) => void;
  placeholder?: string;
  className?: string;
  showAddNewButton?: boolean;
  onAddNew?: () => void;
  disabled?: boolean;
}

// Define interfaces for Google Maps types to fix TypeScript errors
interface AutocompletePrediction {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

interface GeocoderResult {
  geometry: {
    location: {
      lat: () => number;
      lng: () => number;
    };
  };
}

// Create window extensions for TypeScript to recognize Google Maps API
declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

/**
 * Initialize Google Maps services once and store them in the singleton
 * This ensures services are only created once across all instances of LocationSearchInput
 */
function initializeGoogleMapsServices() {
  if (GoogleMapsState.isLoaded) {
    return true;
  }

  try {
    if (window.google && window.google.maps && window.google.maps.places) {
      console.log('[GoogleMaps] Creating global services');
      GoogleMapsState.autocompleteService = new window.google.maps.places.AutocompleteService();
      GoogleMapsState.geocoder = new window.google.maps.Geocoder();
      GoogleMapsState.isLoaded = true;
      console.log('[GoogleMaps] Services initialized successfully');
      return true;
    }
  } catch (error) {
    console.error('[GoogleMaps] Failed to initialize services:', error);
  }

  return false;
}

/**
 * Load the Google Maps script only once for the entire application
 */
function loadGoogleMapsScript() {
  // If already loaded or loading, don't do anything
  if (GoogleMapsState.isLoaded || document.querySelector('script[src*="maps.googleapis.com"]')) {
    return;
  }

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS;
  if (!googleMapsApiKey) {
    console.error('[GoogleMaps] API key is missing');
    return;
  }

  console.log('[GoogleMaps] Loading script');

  // Set up callback before creating the script
  window.initGoogleMaps = () => {
    console.log('[GoogleMaps] Callback executed');
    initializeGoogleMapsServices();
  };

  // Create and add script element
  const script = document.createElement("script");
  const timestamp = new Date().getTime();
  script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places&v=weekly&callback=initGoogleMaps&t=${timestamp}`;
  script.async = true;
  script.defer = true;

  script.onload = () => console.log('[GoogleMaps] Script loaded');
  script.onerror = (error) => console.error('[GoogleMaps] Script loading error:', error);

  document.head.appendChild(script);
}

const LocationSearchInput = ({
  value,
  onChange,
  placeholder = "Enter a location",
  className = "",
  showAddNewButton = true,
  onAddNew,
  disabled = false,
}: LocationSearchInputProps) => {
  const [suggestions, setSuggestions] = useState<AutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [googleMapsReady, setGoogleMapsReady] = useState(GoogleMapsState.isLoaded);
  const { toast } = useToast();

  // Keep local state in sync with prop value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Initialize Google Maps
  useEffect(() => {
    // If already loaded, mark as ready
    if (GoogleMapsState.isLoaded) {
      setGoogleMapsReady(true);
      return;
    }

    // Otherwise, try initializing
    const isInitialized = initializeGoogleMapsServices();
    if (isInitialized) {
      setGoogleMapsReady(true);
      return;
    }

    // If not initialized and no script is loading, load the script
    if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
      loadGoogleMapsScript();
    }

    // Set a timeout to handle cases where Google Maps API fails to load or is restricted
    const loadTimeoutHandle = setTimeout(() => {
      if (!GoogleMapsState.isLoaded) {
        console.warn('[GoogleMaps] API loading timed out or restricted');
        // If we've been waiting too long, show a warning for the user
        if (inputValue.length > 0) {
          toast({
            title: "Address search limited",
            description: "Location search may be limited due to API restrictions. You can still enter addresses manually.",
            variant: "destructive",
          });
        }
      }
    }, 5000); // Wait 5 seconds before showing the warning

    // Check periodically if Google Maps is loaded
    const checkInterval = setInterval(() => {
      if (initializeGoogleMapsServices()) {
        setGoogleMapsReady(true);
        clearInterval(checkInterval);
        clearTimeout(loadTimeoutHandle);
      }
    }, 500);

    // Clean up
    return () => {
      clearInterval(checkInterval);
      clearTimeout(loadTimeoutHandle);
    };
  }, [toast, inputValue.length]);

  // Use server-side search for locations if Google Maps API is restricted
  // This fallback shows users they can enter complete addresses
  const suggestManualAddresses = (searchTerm: string) => {
    // Common address parts to suggest
    const suggestions: AutocompletePrediction[] = [];

    if (searchTerm.length >= 3) {
      // Add a few standard address formats based on user input
      suggestions.push({
        description: `${searchTerm}, Atlanta, GA`,
        place_id: `manual-atlanta-${Date.now()}`,
        structured_formatting: {
          main_text: searchTerm,
          secondary_text: 'Atlanta, GA'
        }
      });

      suggestions.push({
        description: `${searchTerm}, Smyrna, GA`,
        place_id: `manual-smyrna-${Date.now()}`,
        structured_formatting: {
          main_text: searchTerm,
          secondary_text: 'Smyrna, GA'
        }
      });

      // Add more common cities in the area
      if (searchTerm.length > 5) {
        suggestions.push({
          description: `${searchTerm}, Marietta, GA`,
          place_id: `manual-marietta-${Date.now()}`,
          structured_formatting: {
            main_text: searchTerm,
            secondary_text: 'Marietta, GA'
          }
        });
      }
    }

    return suggestions;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Always stop loading state quickly
    let loadingTimeout = setTimeout(() => setIsLoading(false), 800);

    // Only attempt autocomplete if there's enough text and Google Maps is ready
    if (value.length > 2 && googleMapsReady && GoogleMapsState.autocompleteService) {
      setIsLoading(true);

      try {
        GoogleMapsState.autocompleteService.getPlacePredictions(
          {
            input: value,
            componentRestrictions: { country: "us" }
          },
          (predictions: any, status: any) => {
            clearTimeout(loadingTimeout);
            setIsLoading(false);

            // Debug info
            console.log('[GoogleMaps] Autocomplete response:', { 
              status,
              resultsCount: predictions ? predictions.length : 0
            });

            const typedPredictions = (predictions as AutocompletePrediction[]) || [];

            if (status === "OK" && typedPredictions.length > 0) {
              setSuggestions(typedPredictions);
              setShowSuggestions(true);
            } else if (status === "REQUEST_DENIED" || status === "UNKNOWN_ERROR") {
              // API key restriction issue - use our fallback
              console.error("[GoogleMaps] API access denied. Using manual address suggestions.");
              const manualSuggestions = suggestManualAddresses(value);
              setSuggestions(manualSuggestions);
              setShowSuggestions(manualSuggestions.length > 0);

              // Only show the toast once per session
              if (!localStorage.getItem('address_api_restricted_notice')) {
                localStorage.setItem('address_api_restricted_notice', 'shown');
                toast({
                  title: "Limited address search",
                  description: "We're providing basic address suggestions. You can also enter addresses manually.",
                  variant: "default",
                });
              }
            } else {
              setSuggestions([]);
              setShowSuggestions(false);

              // Only show errors for API issues, not zero results
              if (status !== "ZERO_RESULTS" && status !== "OK") {
                console.warn("[GoogleMaps] API error:", status);
              }
            }
          }
        );
      } catch (error) {
        clearTimeout(loadingTimeout);
        console.error("[GoogleMaps] Error in getPlacePredictions:", error);
        setIsLoading(false);

        // Use our fallback suggestions
        const manualSuggestions = suggestManualAddresses(value);
        setSuggestions(manualSuggestions);
        setShowSuggestions(manualSuggestions.length > 0);

        // Show a helpful message if this is the first error
        if (inputValue.length === 0 && value.length > 0 && !localStorage.getItem('address_api_error_notice')) {
          localStorage.setItem('address_api_error_notice', 'shown');
          toast({
            title: "Basic address suggestions",
            description: "Full address search isn't available. We're showing some suggestions, or you can enter addresses manually.",
            variant: "default",
          });
        }
      }
    } else if (!googleMapsReady && value.length > 2 && inputValue.length <= 2) {
      // If Maps API isn't ready but user is typing, use our fallback
      clearTimeout(loadingTimeout);
      setIsLoading(false);

      // Use our fallback suggestions
      const manualSuggestions = suggestManualAddresses(value);
      setSuggestions(manualSuggestions);
      setShowSuggestions(manualSuggestions.length > 0);
    } else if (value.length <= 2) {
      // Input too short, clear suggestions
      clearTimeout(loadingTimeout);
      setIsLoading(false);
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => clearTimeout(loadingTimeout);
  };

  const handleSuggestionClick = (suggestion: AutocompletePrediction) => {
    setInputValue(suggestion.description);
    setShowSuggestions(false);

    // Initialize a timeout to ensure we don't wait forever for geocoding
    let timeoutHandle: NodeJS.Timeout | null = null;

    // Function to handle fallback when geocoding fails
    const handleFallback = () => {
      onChange(suggestion.description);
      console.log("[GoogleMaps] Using address without coordinates due to API limitations");
    };

    // Check if this is a manual fallback suggestion (has 'manual-' prefix in the place_id)
    if (suggestion.place_id.startsWith('manual-')) {
      // For manual suggestions, we'll try to estimate approximate coordinates
      console.log('[GoogleMaps] Using manual address suggestion:', suggestion.description);

      // Extract city from the description to provide a general location
      const address = suggestion.description;
      let lat = 0;
      let lng = 0;

      // Very simple coordinate mapping for common cities in Georgia
      // These are approximations only
      if (address.includes('Atlanta, GA')) {
        // Atlanta coordinates
        lat = 33.7490;
        lng = -84.3880;
      } else if (address.includes('Smyrna, GA')) {
        // Smyrna coordinates
        lat = 33.8839;
        lng = -84.5143;
      } else if (address.includes('Marietta, GA')) {
        // Marietta coordinates
        lat = 33.9526;
        lng = -84.5499;
      }

      // If we have even general coordinates, use them
      if (lat !== 0 && lng !== 0) {
        onChange(suggestion.description, lat, lng);
      } else {
        // Otherwise just use the address
        onChange(suggestion.description);
      }

      return;
    }

    // Set a timeout to ensure we show the address even if geocoding hangs
    timeoutHandle = setTimeout(() => {
      timeoutHandle = null;
      handleFallback();
    }, 2000);

    if (GoogleMapsState.geocoder) {
      try {
        GoogleMapsState.geocoder.geocode(
          { placeId: suggestion.place_id },
          (results: GeocoderResult[], status: string) => {
            // Clear the timeout since we got a response
            if (timeoutHandle) {
              clearTimeout(timeoutHandle);
              timeoutHandle = null;
            }

            if (status === "OK" && results && results[0]) {
              const location = results[0].geometry.location;
              onChange(suggestion.description, location.lat(), location.lng());
            } else if (status === "REQUEST_DENIED") {
              // If we get an API restriction error, try to geocode by address instead
              console.warn("[GoogleMaps] Place lookup denied, using text geocoding");
              try {
                GoogleMapsState.geocoder.geocode(
                  { address: suggestion.description },
                  (addressResults: GeocoderResult[], addressStatus: string) => {
                    if (addressStatus === "OK" && addressResults && addressResults[0]) {
                      const location = addressResults[0].geometry.location;
                      onChange(suggestion.description, location.lat(), location.lng());
                    } else {
                      handleFallback();
                    }
                  }
                );
              } catch (error) {
                handleFallback();
              }
            } else {
              // If geocoding fails, just use the address without coordinates
              handleFallback();
              console.warn("[GoogleMaps] Geocoding failed:", status);

              // Only show error for actual API errors that aren't already handled
              if (status !== "ZERO_RESULTS" && status !== "OK" && status !== "REQUEST_DENIED") {
                toast({
                  title: "Location Issue",
                  description: "There was a problem getting the exact coordinates. Your address has been saved but directions might be less accurate.",
                  variant: "destructive",
                });
              }
            }
          }
        );
      } catch (error) {
        // Clear the timeout since we got a response (an error)
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }

        console.error("[GoogleMaps] Geocoding error:", error);
        handleFallback();

        // Only show toast if this is a genuine error, not an API restriction
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (!errorMsg.includes('REQUEST_DENIED')) {
          toast({
            title: "Location Issue",
            description: "Unable to get coordinates for this address. Your address has been saved but directions might be less accurate.",
            variant: "destructive",
          });
        }
      }
    } else {
      // Clear the timeout since we're handling it immediately
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }

      // If geocoder is not available, just use the address
      handleFallback();
      console.warn("[GoogleMaps] Geocoder not available");
    }
  };

  const handleManualChange = () => {
    onChange(inputValue);
    setShowSuggestions(false);
  };

  const handleBlur = () => {
    // Delayed hiding of suggestions to allow click events
    setTimeout(() => {
      setShowSuggestions(false);

      // If input was changed but no suggestion was selected, pass the manual input
      if (inputValue !== value) {
        handleManualChange();
      }
    }, 200);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex gap-2">
        <div className="relative flex-grow">
          <Input
            type="text"
            placeholder={placeholder}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onFocus={() => inputValue.length > 2 && suggestions.length > 0 && setShowSuggestions(true)}
            disabled={disabled}
            className="pl-10"
          />
          <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
          {isLoading && (
            <Loader2 className="absolute right-3 top-2.5 h-5 w-5 animate-spin text-muted-foreground" />
          )}
        </div>

        {showAddNewButton && onAddNew && (
          <Button 
            type="button" 
            variant="outline" 
            size="icon"
            onClick={onAddNew}
            disabled={disabled}
          >
            <PlusCircle className="h-5 w-5" />
            <span className="sr-only">Add new location</span>
          </Button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.place_id}
              onClick={() => handleSuggestionClick(suggestion)}
              className="cursor-pointer px-4 py-2 text-sm hover:bg-gray-100"
            >
              {suggestion.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LocationSearchInput;
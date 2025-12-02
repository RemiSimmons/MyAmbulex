import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, MapPin, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as GoogleMapsApi from "@/lib/google-maps";

export interface LocationInputProps {
  value: string;
  onChange: (address: string, lat?: number, lng?: number) => void;
  placeholder?: string;
  className?: string;
  showAddNewButton?: boolean;
  onAddNew?: () => void;
  disabled?: boolean;
}

// Define interfaces for Google Maps API results
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

export const LocationInput = ({
  value,
  onChange,
  placeholder = "Enter a location",
  className = "",
  showAddNewButton = true,
  onAddNew,
  disabled = false,
}: LocationInputProps) => {
  const [suggestions, setSuggestions] = useState<AutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [googleMapsReady, setGoogleMapsReady] = useState(false);
  const { toast } = useToast();

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Initialize Google Maps
  useEffect(() => {
    // First check if already initialized
    const services = GoogleMapsApi.getGoogleMapsServices();
    if (services.isInitialized) {
      setGoogleMapsReady(true);
      return;
    }
    
    // Otherwise load the API
    let isMounted = true;
    
    GoogleMapsApi.loadGoogleMapsApi()
      .then(() => {
        if (isMounted) {
          setGoogleMapsReady(true);
        }
      })
      .catch((error) => {
        console.error("[LocationInput] Failed to load Google Maps:", error);
        if (isMounted) {
          // Only show toast if user is actively interacting with this field
          
            toast({
              title: "Location Search Limited",
              description: "We're having trouble with the address search service. You can still enter addresses manually.",
              variant: "destructive",
            });
          }
        }
      });
      
    return () => {
      isMounted = false;
    };
  }, [toast]);

  // Get suggestions from Google Maps API
  const getPlacePredictions = useCallback(
    (input: string) => {
      const services = GoogleMapsApi.getGoogleMapsServices();
      if (!services.autocompleteService) {
        return;
      }
      
      setIsLoading(true);
      
      services.autocompleteService.getPlacePredictions(
        {
          input,
          componentRestrictions: { country: "us" },
        },
        (predictions: any, status: any) => {
          setIsLoading(false);
          
          // Log status for debugging
          console.log("[LocationInput] Autocomplete result:", { 
            status, 
            count: predictions?.length || 0 
          });
          
          const typedPredictions = (predictions as AutocompletePrediction[]) || [];
          
          if (status === "OK" && typedPredictions.length > 0) {
            setSuggestions(typedPredictions);
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
          }
        }
      );
    },
    []
  );

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (value.length > 2 && googleMapsReady) {
      getPlacePredictions(value);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion: AutocompletePrediction) => {
    setInputValue(suggestion.description);
    setShowSuggestions(false);
    
    const services = GoogleMapsApi.getGoogleMapsServices();
    if (services.geocoder) {
      services.geocoder.geocode(
        { placeId: suggestion.place_id },
        (results: GeocoderResult[], status: string) => {
          if (status === "OK" && results && results[0]) {
            const location = results[0].geometry.location;
            onChange(suggestion.description, location.lat(), location.lng());
          } else {
            // If geocoding fails, just use the address
            onChange(suggestion.description);
          }
        }
      );
    } else {
      // If geocoder is not available, just use the address
      onChange(suggestion.description);
    }
  };

  // Handle manual input
  const handleManualChange = () => {
    onChange(inputValue);
    setShowSuggestions(false);
  };

  // Handle input blur
  const handleBlur = () => {
    // Delay hiding suggestions to allow click events
    setTimeout(() => {
      setShowSuggestions(false);
      
      // If value changed but no suggestion selected, use the manual input
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

export default LocationInput;
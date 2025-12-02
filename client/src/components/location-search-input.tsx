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

interface AutocompletePrediction {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

export function LocationSearchInput({ 
  value, 
  onChange, 
  placeholder = "Enter location...", 
  className = "",
  showAddNewButton = false,
  onAddNew,
  disabled = false
}: LocationSearchInputProps) {
  const [suggestions, setSuggestions] = useState<AutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Initialize Google Maps when component mounts
  useEffect(() => {
    let mounted = true;
    
    const initMaps = async () => {
      try {
        await loadGoogleMapsApi();
        if (mounted) {
          setMapsLoaded(true);
        }
      } catch (error) {
        console.error('[LocationSearchInput] Failed to load Google Maps:', error);
        if (mounted) {
          toast({
            title: "Maps Error",
            description: "Failed to load Google Maps. Address search may not work.",
            variant: "destructive",
          });
        }
      }
    };

    initMaps();
    
    return () => {
      mounted = false;
    };
  }, [toast]);

  const fetchSuggestions = useCallback(async (input: string) => {
    if (!input.trim() || input.length < 3) {
      setSuggestions([]);
      return;
    }

    if (!mapsLoaded) {
      console.log('[LocationSearchInput] Maps not loaded yet, skipping suggestions');
      return;
    }

    try {
      setIsLoading(true);
      const predictions = await getPlacePredictions(input);
      setSuggestions(predictions.slice(0, 5)); // Limit to 5 suggestions
    } catch (error) {
      console.error('[LocationSearchInput] Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [mapsLoaded]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange(inputValue);
    setShowSuggestions(true);
    
    // Debounce suggestions
    const timeoutId = setTimeout(() => {
      fetchSuggestions(inputValue);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [onChange, fetchSuggestions]);

  const handleSuggestionClick = useCallback(async (prediction: AutocompletePrediction) => {
    try {
      setIsLoading(true);
      const result = await geocodeAddress(prediction.description);
      
      if (result?.geometry?.location) {
        const lat = result.geometry.location.lat();
        const lng = result.geometry.location.lng();
        onChange(prediction.description, lat, lng);
      } else {
        onChange(prediction.description);
      }
      
      setShowSuggestions(false);
      setSuggestions([]);
    } catch (error) {
      console.error('[LocationSearchInput] Error geocoding address:', error);
      // Still set the address even if geocoding fails
      onChange(prediction.description);
      setShowSuggestions(false);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  }, []);

  const handleInputFocus = useCallback(() => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  }, [suggestions.length]);

  const handleInputBlur = useCallback(() => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-10 pr-4"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((prediction, index) => (
            <button
              key={prediction.place_id || index}
              type="button"
              className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              onClick={() => handleSuggestionClick(prediction)}
            >
              <div className="flex items-center">
                <MapPin className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm">
                    {prediction.structured_formatting?.main_text || prediction.description}
                  </div>
                  {prediction.structured_formatting?.secondary_text && (
                    <div className="text-xs text-gray-500">
                      {prediction.structured_formatting.secondary_text}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showAddNewButton && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddNew}
          className="mt-2 w-full"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add New Address
        </Button>
      )}
    </div>
  );
}
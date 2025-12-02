import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, PlusCircle } from 'lucide-react';
import { useMapsApi } from '@/hooks/use-maps-api';
import { useToast } from '@/hooks/use-toast';

export interface PlaceResult {
  description: string;
  placeId: string;
  lat?: number;
  lng?: number;
}

export interface AddressSearchProps {
  value: string;
  onChange: (value: string, lat?: number, lng?: number) => void;
  placeholder?: string;
  className?: string;
  showAddNewButton?: boolean;
  onAddNew?: () => void;
  disabled?: boolean;
  error?: boolean;
}

export function AddressSearch({
  value,
  onChange,
  placeholder = 'Enter an address',
  className = '',
  showAddNewButton = false,
  onAddNew,
  disabled = false,
  error = false
}: AddressSearchProps) {
  // Internal value state
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const suggestionsRef = useRef<HTMLUListElement>(null);
  const isSelectingSuggestionRef = useRef(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load Maps API
  const { isLoaded, isLoading, error: mapsError, getPlacePredictions, geocode } = useMapsApi();
  const { toast } = useToast();
  
  // Keep internal state in sync with prop value
  useEffect(() => {
    setInputValue(value);
  }, [value]);
  
  // Handle Maps API loading errors
  useEffect(() => {
    if (mapsError) {
      console.error('[AddressSearch] Maps API error:', mapsError);
    }
  }, [mapsError]);
  
  // Handle input change
  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Only search if we have at least 3 characters
    if (value.length >= 3) {
      setIsSearching(true);
      
      // If Maps API is loaded and functional, try to get predictions
      if (isLoaded && !mapsError) {
        try {
          const predictions = await getPlacePredictions(value);
          
          // Convert predictions to our internal format
          if (predictions && predictions.length > 0) {
            const results: PlaceResult[] = predictions.map(prediction => ({
              description: prediction.description,
              placeId: prediction.place_id
            }));
            
            setSuggestions(results);
            setShowSuggestions(results.length > 0);
            setIsSearching(false);
            return;
          }
        } catch (error) {
          console.error('[AddressSearch] Error getting predictions:', error);
        }
      }
      
      // If Maps API fails or isn't loaded, do not provide invalid coordinates
      // Instead, show user they need to use autocomplete suggestions
      setSuggestions([
        {
          description: `For accurate pricing, please select from autocomplete suggestions`,
          placeId: 'no-manual-entry'
        }
      ]);
      setShowSuggestions(true);
      setIsSearching(false);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };
  
  // Handle suggestion selection
  const handleSelectSuggestion = async (suggestion: PlaceResult) => {
    // Don't allow selection of the no-manual-entry placeholder
    if (suggestion.placeId === 'no-manual-entry') {
      setShowSuggestions(false);
      toast({
        title: "Please use autocomplete",
        description: "Select an address from the autocomplete suggestions for accurate pricing",
        variant: "destructive",
      });
      return;
    }
    
    // Clear any pending blur timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    
    // Set flag to prevent blur from interfering
    isSelectingSuggestionRef.current = true;
    
    try {
      // Update input field immediately to show selected address to user
      const selectedAddress = suggestion.description;
      setInputValue(selectedAddress);
      setShowSuggestions(false);
      
      console.log('[AddressSearch] User selected:', selectedAddress);
      
      // If Maps API is loaded and not in error state, try to get coordinates
      if (isLoaded && !mapsError) {
        try {
          const results = await geocode({ placeId: suggestion.placeId });
          
          if (results && results.length > 0) {
            const location = results[0].geometry.location;
            const lat = location.lat();
            const lng = location.lng();
            
            // Add coordinates to the suggestion
            suggestion.lat = lat;
            suggestion.lng = lng;
            
            // Call onChange with both address and coordinates
            onChange(selectedAddress, lat, lng);
            console.log('[AddressSearch] Successfully geocoded:', { address: selectedAddress, lat, lng });
            return;
          }
        } catch (error) {
          console.error('[AddressSearch] Geocoding error:', error);
        }
      }
      
      // If we get here, something failed with geocoding
      // Do not provide invalid coordinates
      console.log('[AddressSearch] Failed to get coordinates for:', suggestion.description);
      toast({
        title: "Coordinates unavailable",
        description: "Please try selecting the address again or choose a different address",
        variant: "destructive",
      });
      onChange(suggestion.description);
    } finally {
      // Always clear the flag when selection completes
      isSelectingSuggestionRef.current = false;
    }
  };
  
  // Handle blur event
  const handleBlur = () => {
    // Use a timeout to allow click events on suggestions to complete
    blurTimeoutRef.current = setTimeout(() => {
      setShowSuggestions(false);
      
      // If a suggestion is being selected, don't interfere
      if (isSelectingSuggestionRef.current) {
        console.log('[AddressSearch] Blur suppressed - suggestion selection in progress');
        return;
      }
      
      // If value changed but no suggestion selected, update without coordinates
      // User will need to select from autocomplete suggestions for coordinates
      if (inputValue !== value) {
        console.log('[AddressSearch] Blur - updating to manual input:', inputValue);
        onChange(inputValue);
      }
    }, 200);
  };
  
  // Close suggestions on escape key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };
  
  // Click outside handler to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Cleanup blur timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);
  
  return (
    <div className={`relative ${className}`}>
      <div className="flex gap-2">
        <div className="relative flex-grow">
          <Input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onFocus={() => inputValue.length > 2 && suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={placeholder}
            disabled={disabled}
            className={`pl-8 ${error ? 'border-red-500' : ''}`}
          />
          <MapPin className="absolute left-2 top-2.5 h-5 w-5 text-muted-foreground" />
          {(isLoading || isSearching) && (
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
        <ul
          ref={suggestionsRef}
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
        >
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.placeId}
              onClick={() => handleSelectSuggestion(suggestion)}
              className="cursor-pointer px-4 py-2 text-sm hover:bg-gray-100"
            >
              {suggestion.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
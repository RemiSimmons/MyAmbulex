import { useRef, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Star, StarOff, ChevronDown, Search, Home, Briefcase, Hospital, Users, CheckIcon, Loader2 } from "lucide-react";
import { loadGoogleMapsApi, getGoogleMapsServices, getPlacePredictions, geocodeAddress } from "@/lib/google-maps-singleton";
// Import types to fix LSP errors
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useEffect as useEffectOnce } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SavedLocation {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  addressType?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

interface AddressInputProps {
  value: string;
  onChange: (value: string, coordinates?: { lat: number; lng: number }, addressDetails?: any) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
  showSavedLocations?: boolean;
}

interface Suggestion {
  description: string;
  placeId: string;
  location?: google.maps.LatLng;
  originalName?: string;
  originalAddress?: string;
}

export default function AddressInput({
  value,
  onChange,
  placeholder = "Enter an address",
  className = "",
  error = false,
  showSavedLocations = true
}: AddressInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setValue] = useState(value); // Control input value directly
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [isLoadingSavedLocations, setIsLoadingSavedLocations] = useState(false);
  const [openPopover, setOpenPopover] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveLocationName, setSaveLocationName] = useState('');
  const [saveLocationType, setSaveLocationType] = useState<string>('other');
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const { toast } = useToast();
  
  // Load the Google Maps API using our centralized utility
  useEffect(() => {
    const initGoogleMaps = async () => {
      try {
        await loadGoogleMapsApi();
        setIsLoaded(true);
      } catch (error) {
        console.error("Failed to load Google Maps API:", error);
      }
    };
    
    initGoogleMaps();
  }, []);
  
  // Initialize Places Service once Google Maps is loaded
  useEffect(() => {
    if (!isLoaded) return;
    
    placesServiceRef.current = createPlacesService();
    
    return () => {
      // No cleanup needed as the service is managed by the utility
    };
  }, [isLoaded]);
  
  // Fetch saved locations
  useEffect(() => {
    if (!showSavedLocations) return;
    
    const fetchSavedLocations = async () => {
      try {
        setIsLoadingSavedLocations(true);
        const response = await apiRequest('GET', '/api/saved-addresses');
        
        if (response.ok) {
          const data = await response.json();
          setSavedLocations(data);
        }
      } catch (error) {
        console.error('Error fetching saved locations:', error);
      } finally {
        setIsLoadingSavedLocations(false);
      }
    };
    
    fetchSavedLocations();
  }, [showSavedLocations]);
  
  // Function to search for places using both AutocompleteService and PlacesService
  const searchPlaces = (query: string) => {
    if (!isLoaded || query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    try {
      // Log the current state of Google Maps services
      console.log("Maps API loaded:", isLoaded);
      console.log("PlacesService available:", !!placesServiceRef.current);
      
      // First try the Autocomplete service which works better for addresses
      const autocompleteService = getAutocompleteService();
      
      if (autocompleteService) {
        console.log("Using AutocompleteService to search:", query);
        
        const request = {
          input: query,
          componentRestrictions: { country: 'us' }, // Limiting to US addresses
          types: [] // Empty array to match all types including addresses and establishments
        };
        
        autocompleteService.getPlacePredictions(
          request,
          (predictions: any[] | null, status: any) => {
            console.log("Autocomplete API response:", { status, predictions: predictions?.length || 0 });
            
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
              console.log("Autocomplete predictions received:", predictions.length);
              
              // Process autocomplete predictions
              const autocompleteSuggestions = predictions
                .slice(0, 5) // Limit to 5 results
                .map(prediction => {
                  // Extract clean name from structured formatting if available
                  const mainText = prediction.structured_formatting?.main_text || 
                                   prediction.description.split(',')[0];
                  
                  return {
                    description: prediction.description,
                    placeId: prediction.place_id,
                    originalName: mainText
                  };
                });
              
              setSuggestions(autocompleteSuggestions);
              setShowSuggestions(true);
            } else {
              console.log("No autocomplete predictions, status:", status);
              
              // Try a different approach - focus specifically on street addresses
              const broadRequest = {
                input: query + " street", // Add "street" to explicitly prioritize road addresses
                componentRestrictions: { country: 'us' },
                types: [] // No type restriction for broader results
              };
              
              autocompleteService.getPlacePredictions(
                broadRequest,
                (broadPredictions: any[] | null, broadStatus: any) => {
                  if (broadStatus === google.maps.places.PlacesServiceStatus.OK && 
                      broadPredictions && broadPredictions.length > 0) {
                    
                    console.log("Broad autocomplete predictions:", broadPredictions);
                    
                    const broadSuggestions = broadPredictions
                      .slice(0, 5)
                      .map(prediction => ({
                        description: prediction.description,
                        placeId: prediction.place_id,
                        originalName: prediction.structured_formatting?.main_text || 
                                     prediction.description.split(',')[0]
                      }));
                    
                    setSuggestions(broadSuggestions);
                    setShowSuggestions(true);
                  } else {
                    // Fall back to PlacesService if Autocomplete doesn't return results
                    fallbackToPlacesService(query);
                  }
                }
              );
            }
          }
        );
      } else {
        console.log("AutocompleteService not available, falling back to PlacesService");
        fallbackToPlacesService(query);
      }
    } catch (error) {
      console.error("Error searching places:", error);
      
      // Check if it's an API key issue
      if (error.toString().includes('API key') || error.toString().includes('quota') || error.toString().includes('billing')) {
        console.error("Google Maps API configuration issue - please check API key and billing");
      }
      
      setSuggestions([]);
      setShowSuggestions(false);
      
      // Add a manual entry option when search fails
      addManualEntryOption(query);
    }
  };
  
  // Helper function to use PlacesService as a fallback
  const fallbackToPlacesService = (query: string) => {
    if (placesServiceRef.current) {
      console.log("Using PlacesService for:", query);
      
      // Use textSearch with enhanced query to prioritize street addresses
      placesServiceRef.current.textSearch(
        { query: query + " address" },
        (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
            console.log("Places results:", results);
            
            const formattedSuggestions = results
              .slice(0, 5) // Limit to 5 results
              .map(place => {
                // Create a full description that includes both business name and address when available
                let description = "";
                
                if (place.name && place.formatted_address) {
                  // If both name and address exist and they're different
                  if (!place.formatted_address.includes(place.name)) {
                    description = `${place.name} - ${place.formatted_address}`;
                  } else {
                    description = place.formatted_address;
                  }
                } else {
                  description = place.formatted_address || place.name || query;
                }
                
                return {
                  description,
                  placeId: place.place_id || "",
                  location: place.geometry?.location,
                  // Store original data separately
                  originalName: place.name,
                  originalAddress: place.formatted_address
                };
              });
            
            setSuggestions(formattedSuggestions);
            setShowSuggestions(true);
          } else {
            // When all automated search fails, add manual entry option
            addManualEntryOption(query);
          }
        }
      );
    } else {
      // When no services are available, add manual entry option
      addManualEntryOption(query);
    }
  };
  
  // Helper to add manual entry option
  const addManualEntryOption = (query: string) => {
    if (query.length >= 5) {
      const manualOption: Suggestion = {
        description: query,
        placeId: 'manual-entry',
        originalName: query
      };
      
      setSuggestions([manualOption]);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };
  
  // Handle user input with debouncing
  useEffect(() => {
    if (!isLoaded) return;
    
    const debounceTimeout = setTimeout(() => {
      if (value && value.length >= 3) {
        searchPlaces(value);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300); // Shorter debounce for better responsiveness
    
    return () => {
      clearTimeout(debounceTimeout);
    };
  }, [value, isLoaded]);
  
  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: Suggestion) => {
    // Immediately update the input field and hide suggestions
    setValue(suggestion.description);
    onChange(suggestion.description);
    setShowSuggestions(false);
    
    // Show loading state when fetching details
    setIsProcessing(true);
    
    // Log that selection was made
    console.log("Selected suggestion:", suggestion);
    
    // Get coordinates if available
    if (suggestion.location) {
      console.log("Location already available in suggestion");
      const coordinates = {
        lat: suggestion.location.lat(),
        lng: suggestion.location.lng()
      };
      
      // Get additional address details via geocoding
      const geocoder = getGeocoder();
      if (geocoder) {
        geocoder.geocode(
          { location: coordinates },
          (results: any, status: any) => {
            if (status === "OK" && results && results.length > 0) {
              console.log("Got address details from reverse geocoding:", results[0]);
              onChange(suggestion.description, coordinates, results[0]);
            } else {
              console.warn("Reverse geocoding failed, proceeding with coordinates only");
              onChange(suggestion.description, coordinates);
            }
            setIsProcessing(false);
          }
        );
      } else {
        onChange(suggestion.description, coordinates);
        setIsProcessing(false);
      }
    } else if (suggestion.placeId && suggestion.placeId !== 'manual-entry' && placesServiceRef.current) {
      // If location is not available directly, fetch the place details
      console.log("Fetching place details for:", suggestion.placeId);
      try {
        placesServiceRef.current.getDetails(
          { 
            placeId: suggestion.placeId, 
            fields: ["geometry", "address_components", "formatted_address"] 
          },
          (place: google.maps.places.PlaceResult | null, status: google.maps.places.PlacesServiceStatus) => {
            console.log("Place details response:", status, place);
            if (status === google.maps.places.PlacesServiceStatus.OK && 
                place && place.geometry && place.geometry.location) {
              const coordinates = {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              };
              console.log("Got coordinates and place details:", coordinates, place);
              onChange(suggestion.description, coordinates, place);
            } else if (status === google.maps.places.PlacesServiceStatus.REQUEST_DENIED) {
              console.warn("API request denied. Proceeding without coordinates.");
              // Try geocoding as a fallback
              tryGeocodingFallback(suggestion.description);
            } else {
              console.warn("Place details not available, status:", status);
              tryGeocodingFallback(suggestion.description);
            }
            setIsProcessing(false);
          }
        );
      } catch (error) {
        console.error("Error getting place details:", error);
        // Try geocoding as a fallback
        tryGeocodingFallback(suggestion.description);
        setIsProcessing(false);
      }
    } else {
      // For manual entry or if placeId is not available
      console.log("No place ID or manual entry. Using geocoding fallback.");
      tryGeocodingFallback(suggestion.description);
    }
  };
  
  // Keep input value in sync with parent component
  useEffect(() => {
    setValue(value);
  }, [value]);

  // Fallback geocoding attempt when Places API fails
  const tryGeocodingFallback = (address: string) => {
    console.log("Trying geocoding fallback for:", address);
    const geocoder = getGeocoder();
    if (geocoder) {
      try {
        geocoder.geocode(
          { address }, 
          (results: any, status: any) => {
            if (status === "OK" && results && results.length > 0) {
              const location = results[0].geometry.location;
              const coordinates = {
                lat: location.lat(),
                lng: location.lng()
              };
              console.log("Geocoding fallback succeeded, coordinates:", coordinates);
              console.log("Address details from geocoding:", results[0]);
              onChange(address, coordinates, results[0]);
            } else {
              console.warn("Geocoding fallback failed:", status);
              // Second level fallback: Try to parse address manually
              handleManualAddressInput(address);
            }
            setIsProcessing(false);
          }
        );
      } catch (error) {
        console.error("Geocoding error:", error);
        // Even for runtime errors, still try manual parsing
        handleManualAddressInput(address);
        setIsProcessing(false);
      }
    } else {
      console.warn("Geocoder not available for fallback");
      // If no geocoder available, try manual parsing
      handleManualAddressInput(address);
      setIsProcessing(false);
    }
  };
  
  // Last resort fallback that manually parses an address string
  const handleManualAddressInput = (address: string) => {
    console.log("Manually parsing address:", address);
    
    // Create manually parsed address components from the string
    const addressParts = address.split(',').map(part => part.trim());
    
    // Try to extract state and ZIP code from the last part
    let zipCode = '';
    let state = '';
    let city = '';
    
    if (addressParts.length > 1) {
      // Last part might contain state and ZIP
      const lastPart = addressParts[addressParts.length - 1];
      // Pattern to match "XX 12345" or "XX 12345-6789"
      const stateZipMatch = lastPart.match(/([A-Z]{2})\s+(\d{5}(-\d{4})?)/);
      
      if (stateZipMatch) {
        state = stateZipMatch[1];
        zipCode = stateZipMatch[2];
      }
      
      // Second to last part is likely the city
      if (addressParts.length > 2) {
        city = addressParts[addressParts.length - 2];
      }
    }
    
    // Create a simplified address details object with what we could extract
    const addressDetails = {
      formatted_address: address,
      address_components: [
        // Street address is likely the first part
        addressParts[0] && {
          long_name: addressParts[0],
          short_name: addressParts[0],
          types: ['street_address']
        },
        // Add city if we found it
        city && {
          long_name: city,
          short_name: city, 
          types: ['locality']
        },
        // Add state if we found it
        state && {
          long_name: state,
          short_name: state,
          types: ['administrative_area_level_1']
        },
        // Add ZIP code if we found it
        zipCode && {
          long_name: zipCode,
          short_name: zipCode,
          types: ['postal_code']
        }
      ].filter(Boolean) // Remove any undefined components
    };
    
    // For coordinates, use approximate fallback or null
    // Since we don't have real coordinates, just accept the address text
    onChange(address, undefined, addressDetails);
  };
  
  // Handle saved location selection
  const handleSelectSavedLocation = (location: SavedLocation) => {
    // Format the full address if we have city, state, zipCode
    let fullAddress = location.address;
    if (location.city && location.state && location.zipCode) {
      fullAddress = `${location.address}, ${location.city}, ${location.state} ${location.zipCode}`;
    }
    
    // Create an address details object with the components we have
    const addressDetails = {
      address_components: [
        // Add any components we have
        location.address && { 
          long_name: location.address,
          short_name: location.address,
          types: ['street_address']
        },
        location.city && {
          long_name: location.city,
          short_name: location.city,
          types: ['locality']
        },
        location.state && {
          long_name: location.state,
          short_name: location.state,
          types: ['administrative_area_level_1']
        },
        location.zipCode && {
          long_name: location.zipCode,
          short_name: location.zipCode,
          types: ['postal_code']
        }
      ].filter(Boolean), // Remove any undefined components
      formatted_address: fullAddress
    };
    
    onChange(fullAddress, { lat: location.lat, lng: location.lng }, addressDetails);
    setOpenPopover(false);
  };
  
  // Open save location dialog
  const handleOpenSaveLocationDialog = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    
    // Set suggested name based on business name if available
    if (suggestion.originalName) {
      setSaveLocationName(suggestion.originalName);
    } else {
      // Try to extract a meaningful name from the address (e.g., street name)
      const addressParts = suggestion.description.split(',');
      if (addressParts.length > 0) {
        setSaveLocationName(addressParts[0].trim());
      } else {
        setSaveLocationName('');
      }
    }
    
    setSaveLocationType('other');
    setShowSaveDialog(true);
  };
  
  // Handle saving current location with improved error handling and feedback
  const handleSaveCurrentLocation = () => {
    // Show loading toast to indicate the process is working
    toast({
      title: "Processing address...",
      description: "Getting location details",
    });
    
    // Check if we have a valid value to work with
    if (inputValue.length > 0) {
      // Create a suggestion from the current value
      const currentSuggestion: Suggestion = {
        description: inputValue,
        placeId: 'manual-entry',
      };
      
      // Try to get coordinates via geocoding
      if (isLoaded) {
        const geocoder = getGeocoder();
        if (geocoder) {
          console.log("Geocoding address:", inputValue);
          
          geocoder.geocode(
            { address: inputValue }, 
            (
              results: any, 
              status: any
            ) => {
              if (status === "OK" && results && results.length > 0) {
                console.log("Geocoding successful:", results[0]);
                currentSuggestion.location = results[0].geometry.location;
                
                // Extract address components for a better user experience
                const addressComponents = results[0].address_components;
                if (addressComponents && addressComponents.length > 0) {
                  // Try to find a meaningful name (like street name)
                  const streetNumber = addressComponents.find((comp: any) => 
                    comp.types.includes('street_number'))?.long_name || '';
                    
                  const route = addressComponents.find((comp: any) => 
                    comp.types.includes('route'))?.long_name || '';
                  
                  const locality = addressComponents.find((comp: any) => 
                    comp.types.includes('locality'))?.long_name || '';
                  
                  // Set a meaningful name based on available components
                  if (route) {
                    currentSuggestion.originalName = streetNumber 
                      ? `${streetNumber} ${route}` 
                      : route;
                  } else if (locality) {
                    currentSuggestion.originalName = locality;
                  } else {
                    // Fallback to first line of address
                    const addressParts = inputValue.split(',');
                    currentSuggestion.originalName = addressParts[0].trim();
                  }
                }
                
                // Show the save dialog with the enhanced suggestion
                console.log("Opening save dialog with suggestion:", currentSuggestion);
                handleOpenSaveLocationDialog(currentSuggestion);
                
              } else {
                console.error("Geocoding error:", status);
                // Fallback approach - still allow saving but without coordinates
                if (status !== "OK") {
                  toast({
                    title: "Limited location data",
                    description: "We'll save this address but some features might be limited"
                  });
                  
                  // Set a basic name from the address
                  const addressParts = inputValue.split(',');
                  currentSuggestion.originalName = addressParts[0].trim();
                  
                  // Still open the dialog even without coordinates
                  handleOpenSaveLocationDialog(currentSuggestion);
                } else {
                  // Complete failure case
                  toast({
                    title: "Unable to save location",
                    description: "Could not process this address format",
                    variant: "destructive",
                  });
                }
              }
            }
          );
        } else {
          console.error("Geocoder not available");
          toast({
            title: "Maps service issue",
            description: "The location service isn't ready. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        console.error("Google Maps API not loaded");
        toast({
          title: "Maps service unavailable",
          description: "Please try again when map services are available",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "No location to save",
        description: "Please enter an address first",
        variant: "destructive",
      });
    }
  };
  
  // Save location to user's saved locations with improved error handling
  const handleSaveLocation = async () => {
    // Basic validation
    if (!saveLocationName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for this location",
        variant: "destructive",
      });
      return;
    }
    
    // Handle case where we have no coordinates but still want to save
    if (!selectedSuggestion) {
      toast({
        title: "Missing location data",
        description: "Please select a valid address",
        variant: "destructive",
      });
      return;
    }
    
    setIsSavingLocation(true);
    console.log("Saving location:", selectedSuggestion);
    
    try {
      // Parse address components
      const addressParts = selectedSuggestion.description.split(',').map(part => part.trim());
      let address = addressParts[0] || '';
      let city = addressParts.length > 1 ? addressParts[1] : '';
      let stateZip = addressParts.length > 2 ? addressParts[2] : '';
      
      // Try to separate state and zip code
      let state = '';
      let zipCode = '';
      
      if (stateZip) {
        const stateZipParts = stateZip.split(' ').filter(Boolean);
        if (stateZipParts.length > 0) {
          state = stateZipParts[0];
          zipCode = stateZipParts.slice(1).join(' ');
        }
      }
      
      // Set coordinates if available, otherwise try to geocode
      let latitude = 0;
      let longitude = 0;
      
      // First try to get coordinates from the suggestion if available
      if (selectedSuggestion.location) {
        try {
          latitude = selectedSuggestion.location.lat();
          longitude = selectedSuggestion.location.lng();
          console.log("Using coordinates from location object:", latitude, longitude);
        } catch (err) {
          console.error("Error getting coordinates:", err);
          // If the location object exists but methods fail, try direct access
          if (typeof selectedSuggestion.location === 'object' && 
              'lat' in selectedSuggestion.location && 
              'lng' in selectedSuggestion.location) {
            try {
              // @ts-ignore - handling dynamic access
              latitude = selectedSuggestion.location.lat;
              // @ts-ignore - handling dynamic access
              longitude = selectedSuggestion.location.lng;
              console.log("Using coordinates from properties:", latitude, longitude);
            } catch (propError) {
              console.error("Error accessing lat/lng properties:", propError);
            }
          }
        }
      }
      
      // If we still don't have valid coordinates, try placeId or geocoding
      if (!latitude && !longitude) {
        // Try placeId first if available and not a manual entry
        if (selectedSuggestion.placeId && selectedSuggestion.placeId !== 'manual-entry' && placesServiceRef.current) {
          const loadingToast = toast({
            title: "Getting precise location...",
            description: "Please wait a moment",
          });
          
          try {
            const place = await new Promise<google.maps.places.PlaceResult | null>((resolve, reject) => {
              placesServiceRef.current?.getDetails(
                { placeId: selectedSuggestion.placeId, fields: ["geometry"] },
                (result, status) => {
                  if (status === google.maps.places.PlacesServiceStatus.OK && result) {
                    resolve(result);
                  } else {
                    console.error("Error getting place details:", status);
                    resolve(null);
                  }
                }
              );
            });
            
            if (place?.geometry?.location) {
              latitude = place.geometry.location.lat();
              longitude = place.geometry.location.lng();
              console.log("Got coordinates from placeId:", latitude, longitude);
            }
          } catch (placeError) {
            console.error("Place details failed:", placeError);
          }
        }
        
        // If still no coordinates, use geocoding as last resort
        if ((!latitude || !longitude) && isLoaded) {
          console.log("Attempting to geocode address:", selectedSuggestion.description);
          
          const geocoder = getGeocoder();
          if (geocoder) {
            const loadingToast = toast({
              title: "Getting precise location...",
              description: "Please wait a moment",
            });
            
            try {
              const results = await new Promise<any[] | null>((resolve) => {
                geocoder.geocode(
                  { address: selectedSuggestion.description },
                  (geocodeResults: any, status: any) => {
                    if (status === "OK" && geocodeResults && geocodeResults.length > 0) {
                      resolve(geocodeResults);
                    } else {
                      console.warn("Geocoding failed:", status);
                      resolve(null);
                    }
                  }
                );
              });
              
              if (results && results.length > 0) {
                latitude = results[0].geometry.location.lat();
                longitude = results[0].geometry.location.lng();
                console.log("Successfully geocoded address:", latitude, longitude);
                
                // Update city/state/zip if we got better data from geocoding
                if (results[0].address_components && results[0].address_components.length > 0) {
                  const components = results[0].address_components;
                  
                  // Update city
                  const cityComponent = components.find((comp: any) => 
                    comp.types.includes('locality') || comp.types.includes('sublocality')
                  );
                  if (cityComponent && !city) {
                    city = cityComponent.long_name;
                  }
                  
                  // Update state
                  const stateComponent = components.find((comp: any) => 
                    comp.types.includes('administrative_area_level_1')
                  );
                  if (stateComponent && !state) {
                    state = stateComponent.short_name;
                  }
                  
                  // Update zipcode
                  const zipComponent = components.find((comp: any) => 
                    comp.types.includes('postal_code')
                  );
                  if (zipComponent && !zipCode) {
                    zipCode = zipComponent.long_name;
                  }
                }
              }
            } catch (geocodeError) {
              console.error("Geocoding error:", geocodeError);
            }
          } else {
            console.warn("Geocoder not available");
          }
        }
      }
      
      // Prepare data for API with all available information
      const locationData = {
        name: saveLocationName,
        address,
        city,
        state,
        zipCode,
        latitude,
        longitude,
        addressType: saveLocationType,
        isDefault: false,
        notes: '',
        fullAddress: selectedSuggestion.description, // Store full address for better display
      };
      
      console.log("Sending location data to API:", locationData);
      
      // Send to API
      const response = await apiRequest('POST', '/api/saved-addresses', locationData);
      
      if (response.ok) {
        const newLocation = await response.json();
        console.log("Location saved successfully:", newLocation);
        
        // Update local state to include the new location
        setSavedLocations(prev => [...prev, {
          id: newLocation.id,
          name: newLocation.name,
          address: newLocation.address,
          lat: newLocation.latitude || 0,
          lng: newLocation.longitude || 0,
          addressType: newLocation.addressType,
          city: newLocation.city,
          state: newLocation.state,
          zipCode: newLocation.zipCode
        }]);
        
        // Show success message
        toast({
          title: "Location saved",
          description: `"${saveLocationName}" has been added to your saved locations`,
        });
        
        // Clear dialog and reset state
        setShowSaveDialog(false);
        setSelectedSuggestion(null);
        setSaveLocationName('');
        setSaveLocationType('other');
        
        // Invalidate any cached data
        queryClient.invalidateQueries({ queryKey: ['/api/saved-addresses'] });
      } else {
        // Try to parse error response
        let errorMessage = 'Failed to save location';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          console.error("Could not parse error response:", e);
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error saving location:', error);
      toast({
        title: "Failed to save location",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSavingLocation(false);
    }
  };
  
  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // Get appropriate icon for address type
  const getAddressIcon = (type?: string) => {
    if (!type) return <MapPin className="h-4 w-4" />;
    
    switch (type.toLowerCase()) {
      case "home":
        return <Home className="h-4 w-4" />;
      case "work":
        return <Briefcase className="h-4 w-4" />;
      case "medical":
        return <Hospital className="h-4 w-4" />;
      case "family":
        return <Users className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  return (
    <div className="relative">
      {/* Combined input field with dropdown for saved locations */}
      <div className="relative w-full">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          <MapPin className="h-4 w-4" />
        </div>
        
        <Popover open={openPopover} onOpenChange={setOpenPopover}>
          <PopoverTrigger asChild>
            <div className="relative w-full">
              <Input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => {
                  const newValue = e.target.value;
                  // Update both local state and parent component
                  setValue(newValue);
                  onChange(newValue);
                  
                  // Trigger search if we have at least 3 characters
                  if (newValue.length >= 3) {
                    console.log("Triggering search from onChange:", newValue);
                    searchPlaces(newValue);
                    setShowSuggestions(true);
                  } else {
                    setShowSuggestions(false);
                  }
                }}
                onFocus={() => {
                  // When focusing the input, try to show suggestions immediately if we have a valid input
                  if (inputValue.length >= 3) {
                    if (suggestions.length > 0) {
                      setShowSuggestions(true);
                    } else {
                      // Try to search for places if we don't have suggestions yet
                      searchPlaces(inputValue);
                    }
                  }
                }}
                placeholder={placeholder}
                className={`pl-9 pr-10 ${className} ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                aria-label={placeholder}
                onBlur={() => {
                  // Geocode the value if it was manually entered (not from suggestions)
                  if (inputValue.length > 10 && isLoaded) {
                    console.log("Attempting to geocode manual entry on blur:", inputValue);
                    const geocoder = getGeocoder();
                    if (geocoder) {
                      geocoder.geocode({ address: inputValue }, (results: any, status: any) => {
                        if (status === "OK" && results && results.length > 0) {
                          const location = results[0].geometry.location;
                          console.log("Successfully geocoded manual entry:", results[0]);
                          // Update the address with coordinates
                          onChange(inputValue, { 
                            lat: location.lat(), 
                            lng: location.lng() 
                          });
                        }
                      });
                    }
                  }
                  // Always hide suggestions on blur after a short delay
                  setTimeout(() => {
                    setShowSuggestions(false);
                  }, 150);
                }}
              />
              
              {/* Dropdown and save button inside input */}
              {showSavedLocations && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {/* Save current location button - More touch-friendly */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 sm:h-8 sm:w-8 text-gray-500 hover:text-yellow-500 hover:bg-yellow-50 rounded-full"
                    onClick={handleSaveCurrentLocation}
                    title="Save this location"
                    disabled={isProcessing || inputValue.length < 5}
                  >
                    <Star className="h-5 w-5" /> {/* Larger icon for easier visibility */}
                  </Button>
                  
                  {/* Dropdown for saved locations - mobile optimized */}
                  {savedLocations.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 sm:h-8 sm:w-8 text-gray-500 rounded-full hover:bg-primary/10"
                      onClick={() => setOpenPopover(true)}
                      title="View saved locations"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </PopoverTrigger>
          
          <PopoverContent className="p-0 w-full sm:w-72 max-w-[calc(100vw-32px)]" align="start">
            <Command>
              <CommandInput placeholder="Search saved locations..." className="text-sm" />
              <CommandList className="max-h-52 sm:max-h-64">
                <CommandEmpty className="py-2 px-4 text-sm text-gray-500">
                  {isLoadingSavedLocations ? "Loading..." : "No saved locations found"}
                </CommandEmpty>
                
                <CommandGroup heading="Saved Locations">
                  {savedLocations.map((location) => (
                    <CommandItem
                      key={location.id}
                      value={`${location.name}-${location.id}`}
                      onSelect={() => handleSelectSavedLocation(location)}
                      className="cursor-pointer py-3 sm:py-2 hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-2 w-full min-w-0">
                        <span className="text-primary flex-shrink-0">
                          {getAddressIcon(location.addressType)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{location.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {location.address}
                            {location.city ? `, ${location.city}` : ""}
                            {location.state ? `, ${location.state}` : ""}
                          </p>
                        </div>
                        {inputValue === location.address && (
                          <CheckIcon className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
                <div className="py-3 px-4 sm:py-2">
                  <p className="text-xs text-gray-500">Type to search for a new address</p>
                </div>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Suggestions dropdown - mobile optimized */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto left-0 right-0">
          <div className="py-2 px-3 sm:px-4 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500">Search Results</p>
          </div>
          <ul className="divide-y divide-gray-100">
            {suggestions.map((suggestion, index) => {
              // For better UI, we can highlight the business name separately
              const hasSeparation = suggestion.description.includes(" - ");
              
              return (
                <li
                  key={index}
                  className="hover:bg-gray-100 cursor-pointer text-sm border-b last:border-b-0 border-gray-100"
                >
                  <div className="flex items-start justify-between gap-2 p-3 sm:px-4 sm:py-2.5">
                    <div 
                      className="flex flex-1 items-start min-w-0" 
                      onClick={() => handleSelectSuggestion(suggestion)}
                    >
                      <Search className="h-5 w-5 sm:h-4 sm:w-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                      <div className="overflow-hidden min-w-0">
                        {hasSeparation ? (
                          <>
                            <span className="font-medium block truncate">
                              {suggestion.description.split(" - ")[0]}
                            </span>
                            <span className="text-gray-600 text-xs block truncate">
                              {" - " + suggestion.description.split(" - ")[1]}
                            </span>
                          </>
                        ) : (
                          <span className="truncate block">{suggestion.description}</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Star icon for saving location - more touch-friendly */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 sm:h-7 sm:w-7 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 transition-colors flex-shrink-0 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSaveLocationDialog(suggestion);
                      }}
                      title="Save this location"
                    >
                      <Star className="h-5 w-5" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      
      {/* Save location dialog - mobile optimized */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md max-w-[95vw] p-4 sm:p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl">Save Location</DialogTitle>
            <DialogDescription>
              Save this address to your locations for quick access in the future.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-5 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3 sm:gap-4">
              <label htmlFor="location-name" className="text-sm font-medium sm:text-right">
                Name
              </label>
              <Input
                id="location-name"
                placeholder="Home, Work, Doctor..."
                value={saveLocationName}
                onChange={(e) => setSaveLocationName(e.target.value)}
                className="sm:col-span-3 h-11 sm:h-10 text-base sm:text-sm"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3 sm:gap-4">
              <label htmlFor="location-type" className="text-sm font-medium sm:text-right">
                Type
              </label>
              <select
                id="location-type"
                value={saveLocationType}
                onChange={(e) => setSaveLocationType(e.target.value)}
                className="sm:col-span-3 flex h-11 sm:h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="home">Home</option>
                <option value="work">Work</option>
                <option value="medical">Medical</option>
                <option value="family">Family</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-3 sm:gap-4">
              <label className="text-sm font-medium sm:text-right">
                Address
              </label>
              <div className="sm:col-span-3 text-sm text-gray-600 break-words">
                {selectedSuggestion?.description}
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-3 mt-2">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto order-2 sm:order-1 h-11 sm:h-10"
              onClick={() => setShowSaveDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveLocation}
              disabled={!saveLocationName || isSavingLocation}
              className="w-full sm:w-auto order-1 sm:order-2 h-11 sm:h-10 text-base sm:text-sm"
            >
              {isSavingLocation ? (
                <>
                  <span className="animate-spin mr-2">◌</span>
                  Saving...
                </>
              ) : 'Save Location'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
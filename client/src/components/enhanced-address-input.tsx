import { useState, useRef, useEffect } from 'react';
import { useMapsApi } from '@/hooks/use-maps-api';
import { AddressSearch } from './address-search';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { CheckIcon, Home, Briefcase, Hospital, Users, MapPin, ChevronDown, StarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface EnhancedAddressInputProps {
  value: string;
  onChange: (value: string, coordinates?: { lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
  showSavedLocations?: boolean;
}

interface PlaceDetails {
  placeId: string;
  description: string;
  latitude?: number;
  longitude?: number;
  originalName?: string;
  originalAddress?: string;
}

export default function EnhancedAddressInput({
  value,
  onChange,
  placeholder = "Enter an address",
  className = "",
  error = false,
  showSavedLocations = true
}: EnhancedAddressInputProps) {
  // State
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [isLoadingSavedLocations, setIsLoadingSavedLocations] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveLocationName, setSaveLocationName] = useState('');
  const [saveLocationType, setSaveLocationType] = useState<string>('other');
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
  const [openPopover, setOpenPopover] = useState(false);
  
  const { toast } = useToast();
  const { isLoaded, geocode } = useMapsApi();
  
  // Load saved locations if feature is enabled
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
        console.error('[EnhancedAddressInput] Error fetching saved locations:', error);
      } finally {
        setIsLoadingSavedLocations(false);
      }
    };
    
    fetchSavedLocations();
  }, [showSavedLocations]);
  
  // Handle address selection
  const handleAddressSelected = async (address: string, lat?: number, lng?: number) => {
    console.log('[EnhancedAddressInput] Address selected:', address, { lat, lng });
    
    // Update the displayed value immediately so user can see their selection
    onChange(address);
    
    // If coordinates are provided directly, use them
    if (lat !== undefined && lng !== undefined) {
      // Validate coordinates before using them
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && lat !== 0 && lng !== 0 && 
          !(lat === 1 && lng === 1)) {
        onChange(address, { lat, lng });
        
        // Store selected place in case user wants to save it
        setSelectedPlace({
          placeId: 'temp-id', // Will be replaced when saved
          description: address,
          latitude: lat,
          longitude: lng
        });
        
        console.log('[EnhancedAddressInput] Valid coordinates provided:', { lat, lng });
        return;
      } else {
        console.warn('[EnhancedAddressInput] Invalid coordinates provided:', { lat, lng });
      }
    }
    
    // Otherwise, try to geocode the address to get coordinates
    if (isLoaded && address.length > 0) {
      try {
        const results = await geocode({ address });
        
        if (results && results.length > 0) {
          const location = results[0].geometry.location;
          const coordinates = {
            lat: location.lat(),
            lng: location.lng()
          };
          
          onChange(address, coordinates);
          
          // Store selected place in case user wants to save it
          setSelectedPlace({
            placeId: results[0].place_id || 'temp-id',
            description: address,
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            originalName: results[0].address_components?.[0]?.long_name,
            originalAddress: results[0].formatted_address
          });
        }
      } catch (error) {
        console.error('[EnhancedAddressInput] Error geocoding address:', error);
        
        // FALLBACK: If geocoding fails, do NOT provide invalid coordinates
        // Let the user know they need to select from autocomplete suggestions
        onChange(address, undefined);
        
        // Store a placeholder selected place without coordinates
        setSelectedPlace({
          placeId: 'fallback-id',
          description: address,
          latitude: undefined,
          longitude: undefined
        });
        
        // Inform user that they need to select from autocomplete suggestions
        toast({
          title: "Please select from suggestions",
          description: "For accurate pricing, please select your address from the autocomplete suggestions that appear as you type.",
          variant: "destructive",
        });
      }
    }
  };
  
  // Handle saved location selection
  const handleSelectSavedLocation = (location: SavedLocation) => {
    // Validate saved location coordinates
    const lat = location.lat;
    const lng = location.lng;
    
    // Check for invalid coordinates including zero values
    if (!lat || !lng || 
        lat === 0 || lng === 0 ||
        Math.abs(lat) > 90 || Math.abs(lng) > 180 ||
        isNaN(lat) || isNaN(lng)) {
      console.error("Invalid saved location coordinates:", location);
      toast({
        title: "Invalid Location",
        description: "This saved location has invalid coordinates. We'll try to look up the address instead.",
        variant: "destructive",
      });
      
      // Try to use the address anyway and let the system geocode it
      let fullAddress = location.address;
      if (location.city && location.state && location.zipCode) {
        fullAddress = `${location.address}, ${location.city}, ${location.state} ${location.zipCode}`;
      }
      
      onChange(fullAddress, undefined);
      setOpenPopover(false);
      return;
    }
    
    console.log("Selected valid saved location:", {
      name: location.name,
      address: location.address,
      coordinates: { lat: lat, lng: lng }
    });
    
    // Format the full address if we have city, state, zipCode
    let fullAddress = location.address;
    if (location.city && location.state && location.zipCode) {
      fullAddress = `${location.address}, ${location.city}, ${location.state} ${location.zipCode}`;
    }
    
    onChange(fullAddress, { lat: lat, lng: lng });
    setOpenPopover(false);
  };
  
  // Handle save location button click
  const handleSaveLocationClick = () => {
    if (!selectedPlace) {
      toast({
        title: "No location selected",
        description: "Please select a location from the suggestions first",
        variant: "destructive"
      });
      return;
    }
    
    if (!selectedPlace.latitude || !selectedPlace.longitude) {
      toast({
        title: "Missing coordinates",
        description: "Cannot save a location without coordinates",
        variant: "destructive"
      });
      return;
    }
    
    // Extract a default name from the address
    let defaultName = '';
    const addressParts = selectedPlace.description.split(',');
    if (addressParts.length > 0) {
      defaultName = addressParts[0].trim();
    }
    
    // Use original name if available
    if (selectedPlace.originalName) {
      defaultName = selectedPlace.originalName;
    }
    
    setSaveLocationName(defaultName);
    setSaveLocationType('other');
    setSaveDialogOpen(true);
  };
  
  // Handle save location form submission
  const handleSaveLocation = async () => {
    if (!selectedPlace || !selectedPlace.latitude || !selectedPlace.longitude) {
      toast({
        title: "Error saving location",
        description: "No coordinates available for this location",
        variant: "destructive",
      });
      return;
    }
    
    setIsSavingLocation(true);
    
    try {
      // Get address components from the place details
      let address = '';
      let city = '';
      let state = '';
      let zipCode = '';

      // If we have the place details from the Google Maps API
      if (selectedPlace.originalAddress) {
        // Try to load response from the console logs to debug
        console.log('Place details available:', selectedPlace);
        
        // First try to parse from the description as a backup
        const addressParts = selectedPlace.description.split(',').map(part => part.trim());
        address = addressParts[0] || '';
        city = addressParts.length > 1 ? addressParts[1] : '';
        let stateZip = addressParts.length > 2 ? addressParts[2] : '';
        
        // Try to separate state and zip code as a backup
        if (stateZip) {
          const stateZipParts = stateZip.split(' ').filter(Boolean);
          if (stateZipParts.length > 0) {
            state = stateZipParts[0];
            zipCode = stateZipParts.slice(1).join(' ');
          }
        }
        
        // Make API request to get full address components
        try {
          const response = await fetch(`/api/maps/get-place-details?placeId=${encodeURIComponent(selectedPlace.placeId)}`);
          if (response.ok) {
            const placeDetails = await response.json();
            console.log('Retrieved place details:', placeDetails);
            
            if (placeDetails && placeDetails.address_components) {
              // Extract address components
              const streetNumber = placeDetails.address_components.find((c: any) => 
                c.types.includes('street_number'))?.long_name || '';
              
              const route = placeDetails.address_components.find((c: any) => 
                c.types.includes('route'))?.long_name || '';
                
              address = streetNumber ? `${streetNumber} ${route}` : route;
              
              city = placeDetails.address_components.find((c: any) => 
                c.types.includes('locality'))?.long_name || '';
                
              state = placeDetails.address_components.find((c: any) => 
                c.types.includes('administrative_area_level_1'))?.short_name || '';
                
              zipCode = placeDetails.address_components.find((c: any) => 
                c.types.includes('postal_code'))?.long_name || '';
            }
          }
        } catch (error) {
          console.error('Error getting place details:', error);
          // Continue with the backup address parsing
        }
      } else {
        // Use the basic address parsing as before
        const addressParts = selectedPlace.description.split(',').map(part => part.trim());
        address = addressParts[0] || '';
        city = addressParts.length > 1 ? addressParts[1] : '';
        let stateZip = addressParts.length > 2 ? addressParts[2] : '';
        
        if (stateZip) {
          const stateZipParts = stateZip.split(' ').filter(Boolean);
          if (stateZipParts.length > 0) {
            state = stateZipParts[0];
            zipCode = stateZipParts.slice(1).join(' ');
          }
        }
      }
      
      // Prepare data for API
      const locationData = {
        name: saveLocationName,
        address,
        city,
        state,
        zipCode,
        latitude: selectedPlace.latitude,
        longitude: selectedPlace.longitude,
        addressType: saveLocationType,
        isDefault: false,
        notes: '',
      };
      
      // Send to API
      const response = await apiRequest('POST', '/api/saved-addresses', locationData);
      
      if (response.ok) {
        const newLocation = await response.json();
        
        // Update local state to include the new location
        setSavedLocations(prev => [...prev, {
          id: newLocation.id,
          name: newLocation.name,
          address: newLocation.address,
          lat: newLocation.latitude,
          lng: newLocation.longitude,
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
        
        // Clear dialog
        setSaveDialogOpen(false);
        setSelectedPlace(null);
        setSaveLocationName('');
        setSaveLocationType('other');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save location');
      }
    } catch (error) {
      console.error('[EnhancedAddressInput] Error saving location:', error);
      toast({
        title: "Failed to save location",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSavingLocation(false);
    }
  };
  
  // Get icon for address type
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
    <>
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-grow">
            <AddressSearch
              value={value}
              onChange={handleAddressSelected}
              placeholder={placeholder}
              className={className}
              error={error}
            />
            {/* Debug display for selected address */}
            {value && (
              <div className="sr-only" aria-live="polite">
                Selected address: {value}
              </div>
            )}
          </div>
          
          {showSavedLocations && (
            <div className="flex gap-1">
              <Popover open={openPopover} onOpenChange={setOpenPopover}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="relative px-3"
                    aria-label="Select or save location"
                    onClick={(e) => {
                      // If there's an active selection, we'll offer to save it
                      // Otherwise, we'll open the popover to select a saved location
                      if (selectedPlace && selectedPlace.latitude && selectedPlace.longitude) {
                        e.stopPropagation();
                        handleSaveLocationClick();
                      }
                    }}
                  >
                    <StarIcon className={`h-4 w-4 mr-1 ${(selectedPlace && selectedPlace.latitude && selectedPlace.longitude) ? 'text-yellow-500' : 'text-gray-400'}`} />
                    {savedLocations.length > 0 && <ChevronDown className="h-3 w-3" />}
                    
                    {/* Show badge if there are saved locations */}
                    {savedLocations.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {savedLocations.length}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                
                {savedLocations.length > 0 && (
                  <PopoverContent className="p-0" align="end" alignOffset={0} sideOffset={5}>
                    <Command>
                      <CommandInput placeholder="Search saved locations..." />
                      <CommandList>
                        <CommandEmpty>No saved locations found.</CommandEmpty>
                        <CommandGroup heading="Saved Locations">
                          {isLoadingSavedLocations ? (
                            <div className="flex justify-center items-center py-4">
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            savedLocations.map((location) => (
                              <CommandItem
                                key={location.id}
                                value={location.id.toString()}
                                onSelect={() => handleSelectSavedLocation(location)}
                                className="flex items-center gap-2"
                              >
                                {getAddressIcon(location.addressType)}
                                <div className="flex flex-col">
                                  <span className="font-medium">{location.name}</span>
                                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {location.address}
                                    {location.city ? `, ${location.city}` : ''}
                                    {location.state ? `, ${location.state}` : ''}
                                    {location.zipCode ? ` ${location.zipCode}` : ''}
                                  </span>
                                </div>
                              </CommandItem>
                            ))
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                )}
              </Popover>
            </div>
          )}
        </div>
      </div>
      
      {/* Save Location Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Location</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="location-name">Location Name</Label>
              <Input
                id="location-name"
                value={saveLocationName}
                onChange={(e) => setSaveLocationName(e.target.value)}
                placeholder="E.g. Home, Office, Doctor's Office"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location-type">Location Type</Label>
              <Select value={saveLocationType} onValueChange={setSaveLocationType}>
                <SelectTrigger id="location-type">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="work">Work</SelectItem>
                  <SelectItem value="medical">Medical</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="py-2 text-sm text-muted-foreground">
              <p>Address: {selectedPlace?.description}</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLocation} disabled={isSavingLocation || !saveLocationName}>
              {isSavingLocation && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
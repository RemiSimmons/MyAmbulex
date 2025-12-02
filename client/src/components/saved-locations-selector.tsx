import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckIcon, ChevronDown, MapPinIcon, Home, Briefcase, Hospital, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { SavedAddress } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

type SavedLocationsProps = {
  onSelect: (location: string, coordinates?: { lat: number, lng: number }) => void;
  placeholder?: string;
};

export default function SavedLocationsSelector({ onSelect, placeholder = "Select a saved location" }: SavedLocationsProps) {
  const [open, setOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SavedAddress | null>(null);
  const { user } = useAuth();

  // Fetch saved addresses
  const { data: savedAddresses, isLoading } = useQuery<SavedAddress[]>({
    queryKey: ["/api/saved-addresses"],
    enabled: !!user,
  });

  // Function to get the appropriate icon for an address type
  const getAddressIcon = (type: string) => {
    switch (type) {
      case "home":
        return <Home className="h-4 w-4" />;
      case "work":
        return <Briefcase className="h-4 w-4" />;
      case "medical":
        return <Hospital className="h-4 w-4" />;
      case "family":
        return <Users className="h-4 w-4" />;
      default:
        return <MapPinIcon className="h-4 w-4" />;
    }
  };

  const handleSelectLocation = (location: SavedAddress) => {
    setSelectedLocation(location);
    setOpen(false);
    
    // Validate coordinates - check for valid non-zero coordinates
    if (!location.latitude || !location.longitude || 
        location.latitude === 0 || location.longitude === 0 ||
        Math.abs(location.latitude) > 90 || Math.abs(location.longitude) > 180 ||
        isNaN(location.latitude) || isNaN(location.longitude)) {
      
      // Show error message for invalid coordinates
      console.error("Invalid saved location coordinates:", location);
      // You might want to add a toast here, but we'll keep it simple for now
      
      // Format the full address string
      const fullAddress = `${location.address}, ${location.city}, ${location.state} ${location.zipCode}`;
      
      // Return without coordinates to let the address input handle geocoding
      onSelect(fullAddress, undefined);
      return;
    }
    
    // Format the full address string
    const fullAddress = `${location.address}, ${location.city}, ${location.state} ${location.zipCode}`;
    
    // Extract valid coordinates
    const coordinates = { lat: location.latitude, lng: location.longitude };
    
    onSelect(fullAddress, coordinates);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedLocation ? (
            <div className="flex items-center gap-2 text-left">
              <span className="text-primary">
                {getAddressIcon(selectedLocation.addressType)}
              </span>
              <div>
                <p className="font-medium">{selectedLocation.name}</p>
                <p className="text-xs text-gray-500 truncate max-w-[220px]">
                  {selectedLocation.address}, {selectedLocation.city}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <MapPinIcon className="h-4 w-4" />
              <span>{placeholder}</span>
            </div>
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search saved locations..." />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Loading..." : "No saved locations found"}
            </CommandEmpty>
            <CommandGroup heading="Saved Locations">
              {savedAddresses?.map((address) => (
                <CommandItem
                  key={address.id}
                  value={`${address.name}-${address.id}`}
                  onSelect={() => handleSelectLocation(address)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-primary">
                      {getAddressIcon(address.addressType)}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium">{address.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {address.address}, {address.city}, {address.state}
                      </p>
                    </div>
                    {selectedLocation?.id === address.id && (
                      <CheckIcon className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
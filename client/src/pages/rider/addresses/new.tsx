import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, MapPin } from "lucide-react";
import { insertSavedAddressSchema } from "@shared/schema";
import { z } from "zod";
import AddressInput from "@/components/address-input";
import MapView from "@/components/map-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Extend the schema for form validation
const savedAddressFormSchema = insertSavedAddressSchema.extend({
  // Add more validation if needed
  name: z.string().min(1, "Nickname is required"),
});

type SavedAddressFormValues = z.infer<typeof savedAddressFormSchema>;

export default function NewSavedAddressPage() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [addressCoordinates, setAddressCoordinates] = useState<{ lat: number, lng: number } | null>(null);
  
  const form = useForm<SavedAddressFormValues>({
    resolver: zodResolver(savedAddressFormSchema),
    defaultValues: {
      name: "",
      userId: 0, // Will be set from the current user on the server
      address: "",
      city: "",
      state: "",
      zipCode: "",
      addressType: "home",
      latitude: 0,
      longitude: 0,
      isDefault: false,
      notes: "",
    },
  });
  
  const createMutation = useMutation({
    mutationFn: async (data: SavedAddressFormValues) => {
      const response = await apiRequest("POST", "/api/saved-addresses", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-addresses"] });
      toast({
        title: "Address saved",
        description: "Your address has been saved successfully",
      });
      navigate("/rider/addresses");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save address",
        variant: "destructive",
      });
    },
  });
  
  function onSubmit(data: SavedAddressFormValues) {
    createMutation.mutate(data);
  }
  
  const handleAddressChange = async (value: string, coordinates?: { lat: number; lng: number }, addressDetails?: any) => {
    form.setValue("address", value);
    
    if (coordinates) {
      form.setValue("latitude", coordinates.lat);
      form.setValue("longitude", coordinates.lng);
      setAddressCoordinates(coordinates);
      
      // If we have address details from Google Maps geocoding
      if (addressDetails) {
        // Try to extract city, state, and ZIP code
        if (addressDetails.address_components) {
          // Extract ZIP code (postal_code)
          const zipComponent = addressDetails.address_components.find(
            (component: any) => component.types.includes('postal_code')
          );
          if (zipComponent) {
            form.setValue("zipCode", zipComponent.long_name);
          }
          
          // Extract city (locality)
          const cityComponent = addressDetails.address_components.find(
            (component: any) => component.types.includes('locality')
          );
          if (cityComponent) {
            form.setValue("city", cityComponent.long_name);
          }
          
          // Extract state (administrative_area_level_1)
          const stateComponent = addressDetails.address_components.find(
            (component: any) => component.types.includes('administrative_area_level_1')
          );
          if (stateComponent) {
            form.setValue("state", stateComponent.short_name);
          }
        } else {
          // Fallback: Try to parse address components from formatted address
          const addressParts = value.split(',').map(part => part.trim());
          
          // Try to extract state and ZIP from the last part (if it exists)
          if (addressParts.length > 2) {
            const stateZipPart = addressParts[addressParts.length - 1];
            const stateZipMatch = stateZipPart.match(/([A-Z]{2})\s+(\d{5}(-\d{4})?)/);
            
            if (stateZipMatch) {
              const [_, state, zipCode] = stateZipMatch;
              form.setValue("state", state);
              form.setValue("zipCode", zipCode);
            }
            
            // Try to extract city from the second-to-last part
            if (addressParts.length > 1) {
              form.setValue("city", addressParts[addressParts.length - 2]);
            }
          }
        }
      }
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate("/rider/addresses")} className="mr-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add New Address</h1>
          <p className="text-muted-foreground">Save a new address for easier booking</p>
        </div>
      </div>
      
      <div className="max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nickname</FormLabel>
                    <FormControl>
                      <Input placeholder="Home, Work, etc." {...field} value={field.value || ''} />
                    </FormControl>
                    <FormDescription>
                      A friendly name for this address
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="addressType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Address Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value || 'home'}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="home" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Home
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="work" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Work
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="medical" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Medical Facility
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="other" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Other
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <AddressInput
                      value={field.value || ''}
                      onChange={handleAddressChange}
                      placeholder="Enter street address"
                      error={!!form.formState.errors.address}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP Code</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Apartment number, building name, special instructions..."
                      className="resize-none"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Additional information about this address to help drivers find you
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Map Preview Card */}
            <Card className="w-full">
              <CardHeader className="pb-3">
                <CardTitle>Location Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {addressCoordinates ? (
                  <MapView
                    id="address-map-preview"
                    pickupLocation={{
                      lat: addressCoordinates.lat,
                      lng: addressCoordinates.lng,
                      label: form.getValues('address') || "Selected Location"
                    }}
                    className="h-64 rounded-lg"
                  />
                ) : (
                  <div className="h-64 rounded-lg bg-gray-100 flex items-center justify-center">
                    <div className="text-gray-600 text-center">
                      <MapPin className="mx-auto h-8 w-8 mb-2 text-gray-400" />
                      <p>Map preview will be shown here</p>
                      <p className="text-sm mt-2">Enter an address to see the location on the map</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-md border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Set as Default</FormLabel>
                    <FormDescription>
                      Use this as your default address for rides
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={!!field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/rider/addresses")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Address
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
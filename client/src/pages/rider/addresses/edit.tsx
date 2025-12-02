import React, { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useParams } from "wouter";
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
import { ArrowLeft, Loader2 } from "lucide-react";
import { insertSavedAddressSchema, SavedAddress } from "@shared/schema";
import AddressInput from "@/components/address-input";

// Extend the schema for form validation
const savedAddressFormSchema = insertSavedAddressSchema.extend({
  // Add more specific validation rules if needed
});

type SavedAddressFormValues = z.infer<typeof savedAddressFormSchema>;

export default function EditSavedAddressPage() {
  const { id } = useParams();
  const addressId = parseInt(id as string);
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  
  const { data: address, isLoading: isLoadingAddress } = useQuery<SavedAddress>({
    queryKey: [`/api/saved-addresses/${addressId}`],
    enabled: !isNaN(addressId),
  });
  
  const form = useForm<SavedAddressFormValues>({
    resolver: zodResolver(savedAddressFormSchema),
    defaultValues: {
      name: "",
      addressType: "home",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      latitude: 0,
      longitude: 0,
      isDefault: false,
      notes: "",
      userId: 0, // Will be set from current user on server
    },
  });
  
  useEffect(() => {
    if (address) {
      form.reset({
        name: address.name || "",
        addressType: address.addressType,
        address: address.address,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        latitude: address.latitude || 0,
        longitude: address.longitude || 0,
        isDefault: address.isDefault || false,
        notes: address.notes || "",
        userId: address.userId,
      });
    }
  }, [address, form]);
  
  const updateMutation = useMutation({
    mutationFn: async (data: SavedAddressFormValues) => {
      const response = await apiRequest("PUT", `/api/saved-addresses/${addressId}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-addresses"] });
      queryClient.invalidateQueries({ queryKey: [`/api/saved-addresses/${addressId}`] });
      toast({
        title: "Address updated",
        description: "Your address has been updated successfully",
      });
      navigate("/rider/addresses");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update address",
        variant: "destructive",
      });
    },
  });
  
  async function onSubmit(data: SavedAddressFormValues) {
    updateMutation.mutate(data);
  }
  
  const handleAddressChange = (value: string, coordinates?: { lat: number; lng: number }) => {
    form.setValue("address", value);
    
    if (coordinates) {
      form.setValue("latitude", coordinates.lat);
      form.setValue("longitude", coordinates.lng);
    }
  };
  
  if (isLoadingAddress) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (!address) {
    return (
      <div className="container mx-auto py-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Address Not Found</h1>
        <p className="mb-4">The requested address could not be found.</p>
        <Button onClick={() => navigate("/rider/addresses")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Addresses
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate("/rider/addresses")} className="mr-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Address</h1>
          <p className="text-muted-foreground">Update your saved address information</p>
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
                    <FormLabel>Name (Optional)</FormLabel>
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
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Additional information about this address to help drivers find you
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Update Address
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
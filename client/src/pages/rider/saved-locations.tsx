import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronLeft, MapPin, Plus, Pencil, Trash2, Home, Briefcase, Hospital, Users, MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import Footer from "@/components/layout/footer";
import { SavedAddress } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Switch } from "@/components/ui/switch";
import AddressInput from "@/components/address-input";

// Form validation schema based on the saved address requirements
const savedAddressSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name must be 50 characters or less"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  addressType: z.enum(["home", "work", "medical", "family", "other"]),
  isDefault: z.boolean().default(false),
  notes: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

type SavedAddressFormValues = z.infer<typeof savedAddressSchema>;

export default function SavedLocations() {
  const [, setLocation] = useLocation();
  const { user, loginMutation } = useAuth();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null);
  const [currentTab, setCurrentTab] = useState("all");
  const [showLoginForm, setShowLoginForm] = useState(!user);
  const [username, setUsername] = useState('Remi');
  const [password, setPassword] = useState('password123');

  // Fetch saved addresses
  const { data: savedAddresses, isLoading } = useQuery<SavedAddress[]>({
    queryKey: ["/api/saved-addresses"],
    enabled: !!user,
  });

  // Initialize form for creating/editing saved addresses
  const form = useForm<SavedAddressFormValues>({
    resolver: zodResolver(savedAddressSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      addressType: "home",
      isDefault: false,
      notes: "",
      latitude: "",
      longitude: "",
    },
  });

  // Handle create address mutation
  const createAddressMutation = useMutation({
    mutationFn: async (data: SavedAddressFormValues) => {
      console.log("Creating new address with data:", data);
      // Convert string coordinates to numbers if present
      const formattedData = {
        ...data,
        latitude: data.latitude ? parseFloat(data.latitude) : undefined,
        longitude: data.longitude ? parseFloat(data.longitude) : undefined,
      };
      
      console.log("Formatted data being sent to API:", formattedData);
      const response = await apiRequest("POST", "/api/saved-addresses", formattedData);
      console.log("Server response status:", response.status);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Location saved",
        description: "Your location has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-addresses"] });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to save location: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle update address mutation
  const updateAddressMutation = useMutation({
    mutationFn: async (data: { id: number; address: SavedAddressFormValues }) => {
      // Convert string coordinates to numbers if present
      const formattedData = {
        ...data.address,
        latitude: data.address.latitude ? parseFloat(data.address.latitude) : undefined,
        longitude: data.address.longitude ? parseFloat(data.address.longitude) : undefined,
      };
      
      const response = await apiRequest("PUT", `/api/saved-addresses/${data.id}`, formattedData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Location updated",
        description: "Your location has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-addresses"] });
      setIsEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update location: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle delete address mutation
  const deleteAddressMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/saved-addresses/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Location deleted",
        description: "Your location has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-addresses"] });
      setIsDeleteDialogOpen(false);
      setSelectedAddress(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete location: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle create form submission
  const onSubmitCreate = (data: SavedAddressFormValues) => {
    createAddressMutation.mutate(data);
  };

  // Handle edit form submission
  const onSubmitEdit = (data: SavedAddressFormValues) => {
    if (selectedAddress) {
      updateAddressMutation.mutate({ id: selectedAddress.id, address: data });
    }
  };

  // Handle delete confirmation
  const handleDelete = () => {
    if (selectedAddress) {
      deleteAddressMutation.mutate(selectedAddress.id);
    }
  };

  // Open edit dialog with address data
  const handleEdit = (address: SavedAddress) => {
    setSelectedAddress(address);
    form.reset({
      name: address.name,
      address: address.address,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      addressType: address.addressType,
      isDefault: address.isDefault ? true : false,
      notes: address.notes || "",
      latitude: address.latitude ? address.latitude.toString() : "",
      longitude: address.longitude ? address.longitude.toString() : "",
    });
    setIsEditDialogOpen(true);
  };

  // Open delete confirmation dialog
  const handleDeleteConfirm = (address: SavedAddress) => {
    setSelectedAddress(address);
    setIsDeleteDialogOpen(true);
  };

  // Handle add new address
  const handleAddNew = () => {
    form.reset({
      name: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      addressType: "home",
      isDefault: false,
      notes: "",
      latitude: "",
      longitude: "",
    });
    setIsAddDialogOpen(true);
  };

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
        return <MapPin className="h-4 w-4" />;
    }
  };

  // Filter addresses based on the selected tab
  const filteredAddresses = savedAddresses?.filter((address) => {
    if (currentTab === "all") return true;
    return address.addressType === currentTab;
  });

  // Helper function to extract city, state from full address (when using AddressInput)
  const extractLocationDetails = (fullAddress: string) => {
    try {
      // Using a safer approach with regex to extract address components
      // This is still simple but more robust than the previous implementation
      const cityStateZipRegex = /([\w\s]+),\s*(\w{2})\s*(\d{5}(?:-\d{4})?)/i;
      const match = fullAddress.match(cityStateZipRegex);
      
      if (match) {
        const [_, city, state, zipCode] = match;
        return { city, state, zipCode };
      }
      
      // Fallback to simpler parsing if regex doesn't match
      const parts = fullAddress.split(',').map(part => part.trim());
      if (parts.length >= 3) {
        // Try to get city from second-to-last component
        const city = parts[parts.length - 3] || '';
        
        // Try to get state/zip from last component
        const lastPart = parts[parts.length - 2] || '';
        const stateZipParts = lastPart.split(' ');
        const state = stateZipParts[0] || '';
        const zipCode = stateZipParts.length > 1 ? stateZipParts[1] : '';
        
        // Only return if we have at least some data
        if (city || state || zipCode) {
          return { city, state, zipCode };
        }
      }
    } catch (error) {
      console.error('Error parsing address:', error);
    }
    
    // Return empty values if parsing fails
    return { city: '', state: '', zipCode: '' };
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Test Login Form */}
        {!user && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Quick Login</CardTitle>
              <CardDescription>Please login to test the saved locations feature</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="username">Username</Label>
                  <Input 
                    id="username" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={() => loginMutation.mutate({ username, password })}
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? 'Logging in...' : 'Login'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/rider/dashboard")}
            className="mb-3"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Saved Locations</h1>
              <p className="text-gray-600">Manage your frequently used pickup and dropoff locations</p>
            </div>
            <Button onClick={handleAddNew} disabled={!user}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Location
            </Button>
          </div>
        </div>

        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="all">All Locations</TabsTrigger>
            <TabsTrigger value="home">Home</TabsTrigger>
            <TabsTrigger value="work">Work</TabsTrigger>
            <TabsTrigger value="medical">Medical</TabsTrigger>
            <TabsTrigger value="family">Family</TabsTrigger>
            <TabsTrigger value="other">Other</TabsTrigger>
          </TabsList>

          <TabsContent value={currentTab} className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : filteredAddresses?.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MapPin className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4 text-center">
                    {currentTab === "all"
                      ? "You don't have any saved locations yet."
                      : `You don't have any ${currentTab} locations saved.`}
                  </p>
                  <Button onClick={handleAddNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Location
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAddresses?.map((address) => (
                  <Card key={address.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg flex items-center">
                          <span className="bg-primary-100 p-1.5 rounded-full mr-2 text-primary">
                            {getAddressIcon(address.addressType)}
                          </span>
                          {address.name}
                        </CardTitle>
                        {address.isDefault && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <CardDescription className="capitalize">
                        {address.addressType}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="text-sm space-y-1">
                        <p className="font-medium">{address.address}</p>
                        <p className="text-gray-500">
                          {address.city}, {address.state} {address.zipCode}
                        </p>
                        {address.notes && (
                          <p className="text-gray-600 mt-2 text-xs italic">
                            {address.notes}
                          </p>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end space-x-2 pt-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(address)}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteConfirm(address)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Footer />

      {/* Add New Location Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Location</DialogTitle>
            <DialogDescription>
              Save a location you visit frequently to make booking easier.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitCreate)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Home, Doctor's Office, etc." {...field} />
                    </FormControl>
                    <FormDescription>
                      A recognizable name for this location
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <AddressInput
                        value={field.value}
                        onChange={(value, coordinates) => {
                          field.onChange(value);
                          if (coordinates) {
                            form.setValue('latitude', coordinates.lat.toString());
                            form.setValue('longitude', coordinates.lng.toString());
                            
                            // Try to parse out city, state, zip from the full address
                            const details = extractLocationDetails(value);
                            if (details) {
                              form.setValue('city', details.city);
                              form.setValue('state', details.state);
                              form.setValue('zipCode', details.zipCode);
                            }
                          }
                        }}
                        placeholder="Enter full address"
                        error={!!form.formState.errors.address}
                      />
                    </FormControl>
                    <FormDescription>
                      Select from the suggested addresses for accurate location data
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} />
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
                        <Input placeholder="State" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP Code</FormLabel>
                    <FormControl>
                      <Input placeholder="ZIP Code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="addressType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Location Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="home" id="home" />
                          <Label htmlFor="home" className="flex items-center">
                            <Home className="mr-2 h-4 w-4" />
                            Home
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="work" id="work" />
                          <Label htmlFor="work" className="flex items-center">
                            <Briefcase className="mr-2 h-4 w-4" />
                            Work
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="medical" id="medical" />
                          <Label htmlFor="medical" className="flex items-center">
                            <Hospital className="mr-2 h-4 w-4" />
                            Medical
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="family" id="family" />
                          <Label htmlFor="family" className="flex items-center">
                            <Users className="mr-2 h-4 w-4" />
                            Family
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="other" id="other" />
                          <Label htmlFor="other" className="flex items-center">
                            <MoreHorizontal className="mr-2 h-4 w-4" />
                            Other
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Set as Default</FormLabel>
                      <FormDescription>
                        This address will be pre-selected when booking
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Special instructions, landmarks, etc."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="mt-6">
                <Button type="submit" disabled={createAddressMutation.isPending}>
                  {createAddressMutation.isPending ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    "Save Location"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Location Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
            <DialogDescription>
              Update the details for this saved location.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitEdit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Home, Doctor's Office, etc." {...field} />
                    </FormControl>
                    <FormDescription>
                      A recognizable name for this location
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <AddressInput
                        value={field.value}
                        onChange={(value, coordinates) => {
                          field.onChange(value);
                          if (coordinates) {
                            form.setValue('latitude', coordinates.lat.toString());
                            form.setValue('longitude', coordinates.lng.toString());
                            
                            // Try to parse out city, state, zip from the full address
                            const details = extractLocationDetails(value);
                            if (details) {
                              form.setValue('city', details.city);
                              form.setValue('state', details.state);
                              form.setValue('zipCode', details.zipCode);
                            }
                          }
                        }}
                        placeholder="Enter full address"
                        error={!!form.formState.errors.address}
                      />
                    </FormControl>
                    <FormDescription>
                      Select from the suggested addresses for accurate location data
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} />
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
                        <Input placeholder="State" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP Code</FormLabel>
                    <FormControl>
                      <Input placeholder="ZIP Code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="addressType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Location Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="home" id="edit-home" />
                          <Label htmlFor="edit-home" className="flex items-center">
                            <Home className="mr-2 h-4 w-4" />
                            Home
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="work" id="edit-work" />
                          <Label htmlFor="edit-work" className="flex items-center">
                            <Briefcase className="mr-2 h-4 w-4" />
                            Work
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="medical" id="edit-medical" />
                          <Label htmlFor="edit-medical" className="flex items-center">
                            <Hospital className="mr-2 h-4 w-4" />
                            Medical
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="family" id="edit-family" />
                          <Label htmlFor="edit-family" className="flex items-center">
                            <Users className="mr-2 h-4 w-4" />
                            Family
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="other" id="edit-other" />
                          <Label htmlFor="edit-other" className="flex items-center">
                            <MoreHorizontal className="mr-2 h-4 w-4" />
                            Other
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Set as Default</FormLabel>
                      <FormDescription>
                        This address will be pre-selected when booking
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Special instructions, landmarks, etc."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="mt-6">
                <Button type="submit" disabled={updateAddressMutation.isPending}>
                  {updateAddressMutation.isPending ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
                      Updating...
                    </>
                  ) : (
                    "Update Location"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Location</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this saved location? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 border rounded-lg p-4 bg-gray-50">
            {selectedAddress && (
              <>
                <p className="font-medium">{selectedAddress.name}</p>
                <p className="text-sm text-gray-600">{selectedAddress.address}</p>
                <p className="text-sm text-gray-600">
                  {selectedAddress.city}, {selectedAddress.state} {selectedAddress.zipCode}
                </p>
              </>
            )}
          </div>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteAddressMutation.isPending}
            >
              {deleteAddressMutation.isPending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
                  Deleting...
                </>
              ) : (
                "Delete Location"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
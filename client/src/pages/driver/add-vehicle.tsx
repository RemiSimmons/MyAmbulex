import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save } from "lucide-react";
import Footer from "@/components/layout/simple-footer";

// Vehicle schema
const vehicleSchema = z.object({
  vehicleType: z.enum(["standard", "wheelchair", "stretcher"]),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) >= 1990 && Number(val) <= new Date().getFullYear(),
    { message: "Please enter a valid year (1990 - present)" }
  ),
  licensePlate: z.string().min(1, "License plate is required"),
  color: z.string().min(1, "Color is required"),
  capacity: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    { message: "Capacity must be a positive number" }
  ),
  wheelchairCapacity: z.string().optional(),
  stretcherCapacity: z.string().optional(),
  hasRamp: z.boolean().optional(),
  hasLift: z.boolean().optional(),
  photo: z.string().optional(),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

export default function AddVehiclePage() {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  
  // Redirect if user is not authenticated
  if (!isLoading && !user) {
    toast({
      title: "Authentication Required",
      description: "Please log in to access this page",
      variant: "destructive"
    });
    setLocation("/auth");
    return null;
  }

  const vehicleForm = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      vehicleType: "standard",
      make: "",
      model: "",
      year: "",
      licensePlate: "",
      color: "",
      capacity: "",
      wheelchairCapacity: "0",
      stretcherCapacity: "0",
      hasRamp: false,
      hasLift: false,
      photo: "",
    }
  });

  // Mutation for submitting vehicle details
  const vehicleMutation = useMutation({
    mutationFn: async (data: VehicleFormValues) => {
      // Extract only the fields that exist in the schema to prevent database errors
      const {
        vehicleType,
        make,
        model,
        year,
        licensePlate,
        color,
        capacity,
        wheelchairCapacity,
        stretcherCapacity,
        hasRamp,
        hasLift,
        photo
      } = data;
      
      // Create a clean object with only the fields that exist in the schema
      const formattedData = {
        vehicleType,
        make,
        model,
        year: Number(year),
        licensePlate,
        color,
        capacity: Number(capacity),
        wheelchairCapacity: wheelchairCapacity ? Number(wheelchairCapacity) : 0,
        stretcherCapacity: stretcherCapacity ? Number(stretcherCapacity) : 0,
        hasRamp,
        hasLift,
        photo
      };
      
      console.log("Submitting vehicle details:", JSON.stringify(formattedData, null, 2));
      
      const response = await apiRequest("POST", "/api/vehicles", formattedData);
      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error response:", errorData);
        throw new Error(errorData.message || "Failed to save vehicle details");
      }
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate vehicles query to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      
      // Reset isSubmitting flag
      setIsSubmitting(false);
      
      toast({
        title: "Vehicle Added Successfully",
        description: "Your new vehicle has been registered",
      });
      
      // Redirect to driver dashboard
      setTimeout(() => {
        setLocation("/driver/dashboard");
      }, 1500);
    },
    onError: (error) => {
      console.error("Vehicle details submission error:", error);
      toast({
        title: "Failed to add vehicle",
        description: error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  });

  const onVehicleSubmit = (data: VehicleFormValues) => {
    setIsSubmitting(true);
    vehicleMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Add a Vehicle</h1>
            <p className="text-gray-600">Register a new vehicle to your driver account.</p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Information</CardTitle>
              <CardDescription>
                Please provide details about your vehicle.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...vehicleForm}>
                <form onSubmit={vehicleForm.handleSubmit(onVehicleSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={vehicleForm.control}
                      name="vehicleType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle Type</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select vehicle type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="standard">Standard</SelectItem>
                              <SelectItem value="wheelchair">Wheelchair Accessible</SelectItem>
                              <SelectItem value="stretcher">Stretcher Transport</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={vehicleForm.control}
                      name="make"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Make</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Toyota" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={vehicleForm.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Sienna" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={vehicleForm.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 2022" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={vehicleForm.control}
                      name="licensePlate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>License Plate</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter license plate" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={vehicleForm.control}
                      name="color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., White" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={vehicleForm.control}
                      name="capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Passenger Capacity</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" placeholder="Number of seats" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {(vehicleForm.watch("vehicleType") === "wheelchair" || vehicleForm.watch("vehicleType") === "stretcher") && (
                    <div className="mt-4 space-y-4">
                      <h3 className="text-lg font-semibold">Accessibility Features</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {vehicleForm.watch("vehicleType") === "wheelchair" && (
                          <FormField
                            control={vehicleForm.control}
                            name="wheelchairCapacity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Wheelchair Capacity</FormLabel>
                                <FormControl>
                                  <Input type="number" min="1" placeholder="Number of wheelchairs" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        {vehicleForm.watch("vehicleType") === "stretcher" && (
                          <FormField
                            control={vehicleForm.control}
                            name="stretcherCapacity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Stretcher Capacity</FormLabel>
                                <FormControl>
                                  <Input type="number" min="1" placeholder="Number of stretchers" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        
                        <div className="space-y-2">
                          <FormField
                            control={vehicleForm.control}
                            name="hasRamp"
                            render={({ field }) => (
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  id="hasRamp"
                                />
                                <label htmlFor="hasRamp" className="text-sm">Vehicle has a ramp</label>
                              </div>
                            )}
                          />
                          <FormField
                            control={vehicleForm.control}
                            name="hasLift"
                            render={({ field }) => (
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  id="hasLift"
                                />
                                <label htmlFor="hasLift" className="text-sm">Vehicle has a lift</label>
                              </div>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <FormField
                    control={vehicleForm.control}
                    name="photo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle Photo</FormLabel>
                        <FormControl>
                          <Input 
                            type="text" 
                            placeholder="Photo URL (optional)" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Enter a URL for a photo of your vehicle
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex flex-wrap gap-3 justify-between">
                    <Button type="button" variant="outline" onClick={() => setLocation("/driver/dashboard")}>
                      Cancel
                    </Button>
                    
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding Vehicle...
                        </>
                      ) : (
                        "Add Vehicle"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
import { useState, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Checkbox
} from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import { queryClient } from "@/lib/queryClient";
import { DriverLayout } from "@/components/layouts/driver-layout";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircleIcon, PlusIcon, XIcon, ChevronLeftIcon, MapPinIcon } from "lucide-react";

// Define the form schema for ride filter
const formSchema = z.object({
  name: z.string().min(1, "Filter name is required"),
  isDefault: z.boolean().default(false),
  priority: z.number().int().min(1).max(10).default(5),
  active: z.boolean().default(true),
  
  // Distance preferences
  minDistance: z.number().nonnegative().nullable().default(null),
  maxDistance: z.number().positive().nullable().default(null),
  
  // Price preferences
  minPrice: z.number().nonnegative().nullable().default(null),
  
  // Vehicle type preferences
  vehicleTypes: z.array(z.string()).default([]),
  
  // Accessibility preferences
  canProvideRamp: z.boolean().default(false),
  canProvideCompanion: z.boolean().default(false),
  canProvideStairChair: z.boolean().default(false),
  maxWaitTimeMinutes: z.number().int().nonnegative().nullable().default(null),
  
  // Time preferences
  timeWindows: z.array(z.object({
    day: z.string(),
    startTime: z.string(),
    endTime: z.string()
  })).default([]),
  
  // Trip preferences
  preferRoundTrips: z.boolean().default(false),
  preferRegularClients: z.boolean().default(false),
  
  // Notification preferences
  notificationEnabled: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

type RideFilterFormProps = {
  filterId?: number;
};

export default function RideFilterForm({ filterId }: RideFilterFormProps) {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const isEditing = !!filterId;
  
  // Fetch existing filter if editing
  const { 
    data: existingFilter, 
    isLoading: isLoadingFilter,
    isError: isErrorFetching,
    error: fetchError
  } = useQuery({
    queryKey: ["/api/driver/ride-filters", filterId],
    queryFn: async () => {
      if (!filterId) return null;
      const res = await fetch(`/api/driver/ride-filters/${filterId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch filter");
      }
      return res.json();
    },
    enabled: !!filterId
  });
  
  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      isDefault: false,
      priority: 5,
      active: true,
      minDistance: null,
      maxDistance: null,
      minPrice: null,
      vehicleTypes: [],
      canProvideRamp: false,
      canProvideCompanion: false,
      canProvideStairChair: false,
      maxWaitTimeMinutes: null,
      timeWindows: [],
      preferRoundTrips: false,
      preferRegularClients: false,
      notificationEnabled: true,
    }
  });
  
  // Set up field array for time windows
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "timeWindows"
  });
  
  // Update form with existing filter data when editing
  useEffect(() => {
    if (existingFilter) {
      // Convert values to match form schema expectations
      const formValues: FormValues = {
        ...existingFilter,
        minDistance: existingFilter.minDistance ?? null,
        maxDistance: existingFilter.maxDistance ?? null,
        minPrice: existingFilter.minPrice ?? null,
        vehicleTypes: existingFilter.vehicleTypes || [],
        maxWaitTimeMinutes: existingFilter.maxWaitTimeMinutes ?? null,
        timeWindows: existingFilter.timeWindows || [],
      };
      
      form.reset(formValues);
    }
  }, [existingFilter, form]);
  
  // Mutations for saving filter
  const createFilterMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await apiRequest("POST", "/api/driver/ride-filters", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/ride-filters"] });
      toast({
        title: "Filter created",
        description: "Your ride filter has been created successfully.",
      });
      navigate("/driver/ride-filters");
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating filter",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const updateFilterMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await apiRequest("PUT", `/api/driver/ride-filters/${filterId}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/ride-filters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/ride-filters", filterId] });
      toast({
        title: "Filter updated",
        description: "Your ride filter has been updated successfully.",
      });
      navigate("/driver/ride-filters");
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating filter",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: FormValues) => {
    // Clean up data before submission
    const cleanedData = {
      ...data,
      minDistance: data.minDistance === null ? undefined : data.minDistance,
      maxDistance: data.maxDistance === null ? undefined : data.maxDistance,
      minPrice: data.minPrice === null ? undefined : data.minPrice,
      maxWaitTimeMinutes: data.maxWaitTimeMinutes === null ? undefined : data.maxWaitTimeMinutes,
    };
    
    if (isEditing) {
      updateFilterMutation.mutate(cleanedData);
    } else {
      createFilterMutation.mutate(cleanedData);
    }
  };
  
  // Add a new time window
  const addTimeWindow = () => {
    append({ day: "any", startTime: "09:00", endTime: "17:00" });
  };
  
  // Loading state
  if (isEditing && isLoadingFilter) {
    return (
      <DriverLayout>
        <div className="px-4 py-6 max-w-4xl mx-auto">
          <div className="flex items-center mb-6">
            <Button 
              onClick={() => navigate("/driver/ride-filters")} 
              variant="ghost" 
              className="mr-4"
            >
              <ChevronLeftIcon className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Loading Filter...</h1>
          </div>
          
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded w-1/3"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-24 bg-muted rounded"></div>
            <div className="h-40 bg-muted rounded"></div>
          </div>
        </div>
      </DriverLayout>
    );
  }
  
  // Error state
  if (isEditing && isErrorFetching) {
    return (
      <DriverLayout>
        <div className="px-4 py-6 max-w-4xl mx-auto">
          <div className="flex items-center mb-6">
            <Button 
              onClick={() => navigate("/driver/ride-filters")} 
              variant="ghost" 
              className="mr-4"
            >
              <ChevronLeftIcon className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Error Loading Filter</h1>
          </div>
          
          <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-lg flex items-center">
            <AlertCircleIcon className="h-5 w-5 mr-3" />
            <div>
              <h3 className="font-medium">Error loading filter</h3>
              <p>{(fetchError as Error)?.message || "There was an error loading the filter. Please try again."}</p>
            </div>
          </div>
          
          <Button onClick={() => navigate("/driver/ride-filters")} className="mt-4">
            Return to Filters
          </Button>
        </div>
      </DriverLayout>
    );
  }
  
  return (
    <DriverLayout>
      <div className="px-4 py-6 max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Button 
            onClick={() => navigate("/driver/ride-filters")} 
            variant="ghost" 
            className="mr-4"
          >
            <ChevronLeftIcon className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">
            {isEditing ? "Edit Ride Filter" : "Create New Ride Filter"}
          </h1>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Filter Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My ride filter" {...field} />
                      </FormControl>
                      <FormDescription>
                        Give your filter a descriptive name
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority (1-10)</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <Slider
                              min={1}
                              max={10}
                              step={1}
                              value={[field.value]}
                              onValueChange={(value) => field.onChange(value[0])}
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Highest (1)</span>
                              <span>Lowest (10)</span>
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Higher priority filters are applied first
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="isDefault"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Default Filter</FormLabel>
                            <FormDescription>
                              Set as the default filter for all rides
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
                      name="active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Active</FormLabel>
                            <FormDescription>
                              Enable or disable this filter
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
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Accordion type="multiple" defaultValue={["distance", "vehicle", "accessibility", "time", "preferences"]}>
              {/* Distance Preferences */}
              <AccordionItem value="distance">
                <AccordionTrigger className="text-lg font-medium">Distance Preferences</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 p-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="minDistance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Distance (miles)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="0.1"
                                placeholder="0"
                                {...field}
                                onChange={(e) => {
                                  const value = e.target.value === "" ? null : Number(e.target.value);
                                  field.onChange(value);
                                }}
                                value={field.value === null ? "" : field.value}
                              />
                            </FormControl>
                            <FormDescription>
                              Minimum ride distance you're willing to drive
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="maxDistance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Maximum Distance (miles)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="0.1"
                                placeholder="No limit"
                                {...field}
                                onChange={(e) => {
                                  const value = e.target.value === "" ? null : Number(e.target.value);
                                  field.onChange(value);
                                }}
                                value={field.value === null ? "" : field.value}
                              />
                            </FormControl>
                            <FormDescription>
                              Maximum ride distance you're willing to drive
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              {/* Price Preferences */}
              <AccordionItem value="price">
                <AccordionTrigger className="text-lg font-medium">Price Preferences</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 p-2">
                    <FormField
                      control={form.control}
                      name="minPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Ride Price ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0"
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value === "" ? null : Number(e.target.value);
                                field.onChange(value);
                              }}
                              value={field.value === null ? "" : field.value}
                            />
                          </FormControl>
                          <FormDescription>
                            Minimum price you're willing to accept for a ride
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              {/* Vehicle Preferences */}
              <AccordionItem value="vehicle">
                <AccordionTrigger className="text-lg font-medium">Vehicle Type Preferences</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 p-2">
                    <FormField
                      control={form.control}
                      name="vehicleTypes"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel>Vehicle Types</FormLabel>
                            <FormDescription>
                              Select the vehicle types you want to match with
                            </FormDescription>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                              { id: "sedan", label: "Sedan" },
                              { id: "suv", label: "SUV" },
                              { id: "van", label: "Van" },
                              { id: "wheelchair_van", label: "Wheelchair Van" },
                              { id: "ambulance", label: "Ambulance" }
                            ].map((vehicle) => (
                              <FormField
                                key={vehicle.id}
                                control={form.control}
                                name="vehicleTypes"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={vehicle.id}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(vehicle.id)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...field.value, vehicle.id])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== vehicle.id
                                                  )
                                                );
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        {vehicle.label}
                                      </FormLabel>
                                    </FormItem>
                                  );
                                }}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              {/* Accessibility Preferences */}
              <AccordionItem value="accessibility">
                <AccordionTrigger className="text-lg font-medium">Accessibility & Support Preferences</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 p-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="canProvideRamp"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel>Wheelchair Ramp</FormLabel>
                              <FormDescription>
                                Can provide wheelchair ramp access
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
                        name="canProvideCompanion"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel>Companion Assistance</FormLabel>
                              <FormDescription>
                                Can provide companion assistance
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
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="canProvideStairChair"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel>Stair Chair</FormLabel>
                              <FormDescription>
                                Can provide stair chair assistance
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
                        name="maxWaitTimeMinutes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Maximum Wait Time (minutes)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="5"
                                placeholder="No limit"
                                {...field}
                                onChange={(e) => {
                                  const value = e.target.value === "" ? null : Number(e.target.value);
                                  field.onChange(value);
                                }}
                                value={field.value === null ? "" : field.value}
                              />
                            </FormControl>
                            <FormDescription>
                              Maximum time you're willing to wait at appointments
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              {/* Time Preferences */}
              <AccordionItem value="time">
                <AccordionTrigger className="text-lg font-medium">Time Preferences</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 p-2">
                    <div className="flex justify-between items-center">
                      <Label>Time Windows</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addTimeWindow}
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Add Time Window
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      {fields.length === 0 ? (
                        <div className="text-center py-4 border rounded-md text-muted-foreground">
                          No time windows specified. Add one to filter rides by specific days and times.
                        </div>
                      ) : (
                        fields.map((field, index) => (
                          <div key={field.id} className="flex items-end gap-2 border p-3 rounded-md">
                            <div className="flex-1">
                              <FormField
                                control={form.control}
                                name={`timeWindows.${index}.day`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Day</FormLabel>
                                    <Select
                                      value={field.value}
                                      onValueChange={field.onChange}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select day" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="any">Any day</SelectItem>
                                        <SelectItem value="monday">Monday</SelectItem>
                                        <SelectItem value="tuesday">Tuesday</SelectItem>
                                        <SelectItem value="wednesday">Wednesday</SelectItem>
                                        <SelectItem value="thursday">Thursday</SelectItem>
                                        <SelectItem value="friday">Friday</SelectItem>
                                        <SelectItem value="saturday">Saturday</SelectItem>
                                        <SelectItem value="sunday">Sunday</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <div className="flex-1">
                              <FormField
                                control={form.control}
                                name={`timeWindows.${index}.startTime`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Start Time</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="time"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <div className="flex-1">
                              <FormField
                                control={form.control}
                                name={`timeWindows.${index}.endTime`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>End Time</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="time"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                              className="mb-2 text-destructive hover:text-destructive"
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              {/* Other Preferences */}
              <AccordionItem value="preferences">
                <AccordionTrigger className="text-lg font-medium">Other Preferences</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 p-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="preferRoundTrips"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel>Round Trips</FormLabel>
                              <FormDescription>
                                Prefer round trip rides
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
                        name="preferRegularClients"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel>Regular Clients</FormLabel>
                              <FormDescription>
                                Prefer rides from regular clients
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
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="notificationEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Notifications</FormLabel>
                            <FormDescription>
                              Receive notifications for rides that match this filter
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
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/driver/ride-filters")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createFilterMutation.isPending || updateFilterMutation.isPending}
              >
                {createFilterMutation.isPending || updateFilterMutation.isPending ? (
                  "Saving..."
                ) : isEditing ? (
                  "Update Filter"
                ) : (
                  "Create Filter"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DriverLayout>
  );
}
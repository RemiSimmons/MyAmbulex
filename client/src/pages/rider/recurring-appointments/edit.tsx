import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import EnhancedAddressInput from "@/components/enhanced-address-input";
import { format } from "date-fns";

// Create a type for our form values
interface FormValues {
  title: string;
  frequency: string;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  pickupLocation: string;
  pickupLocationLat?: number;
  pickupLocationLng?: number;
  dropoffLocation: string;
  dropoffLocationLat?: number;
  dropoffLocationLng?: number;
  appointmentTime: string;
  vehicleType: string;
  isActive: boolean;
  isRoundTrip: boolean;
  returnTime?: string;
  needsRamp: boolean;
  needsCompanion: boolean;
  needsStairChair: boolean;
  needsWaitTime: boolean;
  waitTimeMinutes?: number;
  specialInstructions?: string;
}

export default function EditRecurringAppointment() {
  const { id } = useParams();
  const appointmentId = parseInt(id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showDaysOfWeek, setShowDaysOfWeek] = useState(false);
  const [showDayOfMonth, setShowDayOfMonth] = useState(false);

  // Fetch the appointment data
  const { data: appointment, isLoading, error } = useQuery({
    queryKey: [`/api/recurring-appointments/${appointmentId}`],
    queryFn: async () => {
      const res = await fetch(`/api/recurring-appointments/${appointmentId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch appointment");
      }
      return res.json();
    },
  });

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(
      z.object({
        title: z.string().min(1, "Title is required"),
        frequency: z.string(),
        daysOfWeek: z.array(z.number()).optional(),
        dayOfMonth: z.number().min(1).max(31).optional(),
        pickupLocation: z.string().min(1, "Pickup location is required"),
        pickupLocationLat: z.number().optional(),
        pickupLocationLng: z.number().optional(),
        dropoffLocation: z.string().min(1, "Dropoff location is required"),
        dropoffLocationLat: z.number().optional(),
        dropoffLocationLng: z.number().optional(),
        appointmentTime: z.string().min(1, "Appointment time is required"),
        vehicleType: z.string(),
        isActive: z.boolean(),
        isRoundTrip: z.boolean(),
        returnTime: z.string().optional(),
        needsRamp: z.boolean(),
        needsCompanion: z.boolean(),
        needsStairChair: z.boolean(),
        needsWaitTime: z.boolean(),
        waitTimeMinutes: z.number().optional(),
        specialInstructions: z.string().optional(),
      })
    ),
    defaultValues: {
      title: "",
      frequency: "weekly",
      pickupLocation: "",
      dropoffLocation: "",
      appointmentTime: "",
      vehicleType: "standard",
      isActive: true,
      isRoundTrip: false,
      needsRamp: false,
      needsCompanion: false,
      needsStairChair: false,
      needsWaitTime: false,
      waitTimeMinutes: 30,
    },
  });

  // When appointment data is loaded, set form values
  useEffect(() => {
    if (appointment) {
      // Format the appointment time from ISO to HH:MM
      const appointmentTime = format(
        new Date(appointment.appointmentTime),
        "HH:mm"
      );
      
      // Format the return time from ISO to HH:MM if exists
      const returnTime = appointment.returnTime
        ? format(new Date(appointment.returnTime), "HH:mm")
        : undefined;

      // Update form values
      form.reset({
        title: appointment.title,
        frequency: appointment.frequency,
        daysOfWeek: appointment.daysOfWeek || [],
        dayOfMonth: appointment.dayOfMonth,
        pickupLocation: appointment.pickupLocation,
        pickupLocationLat: appointment.pickupLocationLat,
        pickupLocationLng: appointment.pickupLocationLng,
        dropoffLocation: appointment.dropoffLocation,
        dropoffLocationLat: appointment.dropoffLocationLat,
        dropoffLocationLng: appointment.dropoffLocationLng,
        appointmentTime: appointmentTime,
        vehicleType: appointment.vehicleType,
        isActive: appointment.isActive,
        isRoundTrip: appointment.isRoundTrip,
        returnTime: returnTime,
        needsRamp: appointment.needsRamp,
        needsCompanion: appointment.needsCompanion,
        needsStairChair: appointment.needsStairChair,
        needsWaitTime: appointment.needsWaitTime,
        waitTimeMinutes: appointment.waitTimeMinutes,
        specialInstructions: appointment.specialInstructions,
      });

      // Set conditional fields visibility
      setShowDaysOfWeek(appointment.frequency === "weekly");
      setShowDayOfMonth(appointment.frequency === "monthly");
    }
  }, [appointment, form]);

  // Watch form values to control conditional fields
  const frequency = form.watch("frequency");
  const isRoundTrip = form.watch("isRoundTrip");
  const needsWaitTime = form.watch("needsWaitTime");

  // Handle frequency change to show/hide conditional fields
  const handleFrequencyChange = (value: string) => {
    setShowDaysOfWeek(value === "weekly");
    setShowDayOfMonth(value === "monthly");
    form.setValue("frequency", value as any);
  };

  // Update mutation
  const updateAppointmentMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      // Format data for API
      const formattedData = {
        ...data,
        // Convert appointment time string to Date object
        appointmentTime: new Date(
          `2000-01-01T${data.appointmentTime}:00`
        ).toISOString(),
        // Convert return time string to Date object if it exists
        returnTime: data.returnTime
          ? new Date(`2000-01-01T${data.returnTime}:00`).toISOString()
          : undefined,
      };

      const response = await apiRequest(
        "PUT",
        `/api/recurring-appointments/${appointmentId}`,
        formattedData
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update recurring appointment");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Recurring appointment updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/recurring-appointments'] });
      queryClient.invalidateQueries({ queryKey: [`/api/recurring-appointments/${appointmentId}`] });
      navigate("/rider/recurring-appointments");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Form submission handler
  const onSubmit = (values: FormValues) => {
    updateAppointmentMutation.mutate(values);
  };

  // Days of week options
  const daysOfWeek = [
    { value: 0, label: "Sunday" },
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-destructive mb-4">Error loading recurring appointment</p>
        <Button 
          onClick={() => queryClient.invalidateQueries({ queryKey: [`/api/recurring-appointments/${appointmentId}`] })}
          variant="outline"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-2xl">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate("/rider/recurring-appointments")}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Appointments
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Edit Recurring Appointment</CardTitle>
          <CardDescription>
            Update your recurring appointment details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Appointment Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Weekly Dialysis"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Give your recurring appointment a descriptive name.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency</FormLabel>
                        <Select
                          onValueChange={handleFrequencyChange}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="biweekly">Bi-weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="appointmentTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Appointment Time</FormLabel>
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

                {/* Conditional fields based on frequency */}
                {showDaysOfWeek && (
                  <FormField
                    control={form.control}
                    name="daysOfWeek"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel>Days of Week</FormLabel>
                          <FormDescription>
                            Select which days of the week this appointment occurs.
                          </FormDescription>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {daysOfWeek.map((day) => (
                            <FormField
                              key={day.value}
                              control={form.control}
                              name="daysOfWeek"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={day.value}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(day.value)}
                                        onCheckedChange={(checked) => {
                                          const currentValues = field.value || [];
                                          return checked
                                            ? field.onChange([...currentValues, day.value])
                                            : field.onChange(
                                                currentValues.filter(
                                                  (value) => value !== day.value
                                                )
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer">
                                      {day.label}
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
                )}

                {showDayOfMonth && (
                  <FormField
                    control={form.control}
                    name="dayOfMonth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Day of Month</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={31}
                            placeholder="e.g., 15"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || "")}
                            value={field.value}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter the day of the month (1-31) this appointment occurs.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Location Information */}
              <div className="space-y-4 pt-6">
                <h3 className="text-lg font-medium">Location Information</h3>

                <FormField
                  control={form.control}
                  name="pickupLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pickup Location</FormLabel>
                      <FormControl>
                        <EnhancedAddressInput
                          className="w-full"
                          value={field.value}
                          onChange={(address, coordinates) => {
                            field.onChange(address);
                            if (coordinates) {
                              form.setValue("pickupLocationLat", coordinates.lat);
                              form.setValue("pickupLocationLng", coordinates.lng);
                            }
                          }}
                          placeholder="Enter pickup address"
                          showSavedLocations={true}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dropoffLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dropoff Location</FormLabel>
                      <FormControl>
                        <EnhancedAddressInput
                          className="w-full"
                          value={field.value}
                          onChange={(address, coordinates) => {
                            field.onChange(address);
                            if (coordinates) {
                              form.setValue("dropoffLocationLat", coordinates.lat);
                              form.setValue("dropoffLocationLng", coordinates.lng);
                            }
                          }}
                          placeholder="Enter destination address"
                          showSavedLocations={true}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Round Trip Options */}
              <div className="space-y-4 pt-6">
                <h3 className="text-lg font-medium">Round Trip Options</h3>

                <FormField
                  control={form.control}
                  name="isRoundTrip"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Round Trip</FormLabel>
                        <FormDescription>
                          Need transportation back to your original location?
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

                {isRoundTrip && (
                  <FormField
                    control={form.control}
                    name="returnTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Return Time</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          When should your return trip be scheduled?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Vehicle & Assistance Options */}
              <div className="space-y-4 pt-6">
                <h3 className="text-lg font-medium">Vehicle & Assistance Options</h3>

                <FormField
                  control={form.control}
                  name="vehicleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vehicle type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="standard">Ambulatory</SelectItem>
                          <SelectItem value="wheelchair">Wheelchair Accessible</SelectItem>
                          <SelectItem value="stretcher">Stretcher</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the type of vehicle you need.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="needsRamp"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Needs Ramp</FormLabel>
                          <FormDescription>
                            Vehicle should be equipped with a ramp.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="needsCompanion"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Traveling with Companion</FormLabel>
                          <FormDescription>
                            Will someone be accompanying you?
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="needsStairChair"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Needs Stair Chair</FormLabel>
                          <FormDescription>
                            Require assistance with stairs?
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="needsWaitTime"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Driver Should Wait</FormLabel>
                          <FormDescription>
                            Driver will wait during your appointment.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  {needsWaitTime && (
                    <FormField
                      control={form.control}
                      name="waitTimeMinutes"
                      render={({ field }) => (
                        <FormItem className="ml-7">
                          <FormLabel>Wait Time (minutes)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={15}
                              max={240}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                              value={field.value}
                            />
                          </FormControl>
                          <FormDescription>
                            How long should the driver wait? (15-240 minutes)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="specialInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Instructions</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any special instructions for the driver..."
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Provide any additional information the driver should know.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active</FormLabel>
                        <FormDescription>
                          Is this recurring appointment active?
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

              <Button
                type="submit"
                className="w-full"
                disabled={updateAppointmentMutation.isPending}
              >
                {updateAppointmentMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Recurring Appointment"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
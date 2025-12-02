import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
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
import { insertRecurringAppointmentSchema } from "@shared/schema";
import { Link } from "wouter";

// Create a custom schema for the form with client-side validation
const formSchema = insertRecurringAppointmentSchema.extend({
  appointmentTime: z.string().min(1, "Appointment time is required"),
  returnTime: z.string().optional(),
});

// Create a type for our form values
type FormValues = z.infer<typeof formSchema>;

export default function NewRecurringAppointment() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showDaysOfWeek, setShowDaysOfWeek] = useState(false);
  const [showDayOfMonth, setShowDayOfMonth] = useState(false);

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      frequency: "weekly",
      pickupLocation: "",
      dropoffLocation: "",
      appointmentTime: "",
      vehicleType: "standard",
      isActive: true, // Fixed schema property name from active to isActive
      isRoundTrip: false,
      needsRamp: false,
      needsCompanion: false,
      needsStairChair: false,
      needsWaitTime: false,
      waitTimeMinutes: 30,
    },
  });

  // Watch form values to control conditional fields
  const frequency = form.watch("frequency");
  const isRoundTrip = form.watch("isRoundTrip");
  const needsWaitTime = form.watch("needsWaitTime");

  // Update conditional fields visibility based on form values
  useState(() => {
    setShowDaysOfWeek(frequency === "weekly");
    setShowDayOfMonth(frequency === "monthly");
  });

  // Handle frequency change to show/hide conditional fields
  const handleFrequencyChange = (value: string) => {
    setShowDaysOfWeek(value === "weekly");
    setShowDayOfMonth(value === "monthly");
    form.setValue("frequency", value as any);
  };

  // Create mutation
  const createAppointmentMutation = useMutation({
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
        // Convert daysOfWeek to an array of numbers if it exists
        daysOfWeek: data.daysOfWeek
          ? Array.from(data.daysOfWeek)
          : undefined,
      };

      const response = await apiRequest(
        "POST",
        "/api/recurring-appointments",
        formattedData
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create recurring appointment");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Recurring appointment created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/recurring-appointments'] });
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
    createAppointmentMutation.mutate(values);
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
          <CardTitle>Create Recurring Appointment</CardTitle>
          <CardDescription>
            Set up a recurring medical appointment to automatically generate ride requests.
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
                          defaultValue={field.value}
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
                        defaultValue={field.value}
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
                          Should this recurring appointment be activated immediately?
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
                disabled={createAppointmentMutation.isPending}
              >
                {createAppointmentMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Recurring Appointment"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
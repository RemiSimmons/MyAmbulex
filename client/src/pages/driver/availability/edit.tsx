import React, { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { DriverLayout } from "@/components/layouts/driver-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

// Define type for availability schedule
type AvailabilitySchedule = {
  id: number;
  driverId: number;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // "HH:MM" format
  endTime: string; // "HH:MM" format
  isRecurring: boolean;
  createdAt: string;
};

// Zod schema for the form
const availabilityFormSchema = z.object({
  dayOfWeek: z.string(),
  startTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:MM format"),
  endTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:MM format"),
  isRecurring: z.boolean().default(true),
});

// Helper function to convert day number to day name
const getDayName = (dayNumber: number) => {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[dayNumber];
};

export default function EditAvailabilitySchedule() {
  const params = useParams<{ id: string }>();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const id = parseInt(params.id);

  // Fetch availability schedule by ID
  const {
    data: schedule,
    isLoading,
    error,
  } = useQuery<AvailabilitySchedule>({
    queryKey: ["/api/driver/availability", id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/driver/availability/${id}`);
      return await response.json();
    },
  });

  // Form setup
  const form = useForm<z.infer<typeof availabilityFormSchema>>({
    resolver: zodResolver(availabilityFormSchema),
    defaultValues: {
      dayOfWeek: "0",
      startTime: "09:00",
      endTime: "17:00",
      isRecurring: true,
    },
  });

  // Update form values when schedule is loaded
  useEffect(() => {
    if (schedule) {
      form.reset({
        dayOfWeek: schedule.dayOfWeek.toString(),
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        isRecurring: schedule.isRecurring,
      });
    }
  }, [schedule, form]);

  // Update availability schedule mutation
  const updateAvailabilityMutation = useMutation({
    mutationFn: async (data: z.infer<typeof availabilityFormSchema>) => {
      const response = await apiRequest("PUT", `/api/driver/availability/${id}`, {
        dayOfWeek: parseInt(data.dayOfWeek),
        startTime: data.startTime,
        endTime: data.endTime,
        isRecurring: data.isRecurring,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/availability"] });
      toast({
        title: "Availability schedule updated",
        description: "Your changes have been saved successfully.",
      });
      navigate("/driver/availability");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update availability",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Submit handler
  const onSubmit = (values: z.infer<typeof availabilityFormSchema>) => {
    updateAvailabilityMutation.mutate(values);
  };

  if (isLoading) {
    return (
      <DriverLayout>
        <div className="container mx-auto p-4 flex justify-center items-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DriverLayout>
    );
  }

  if (error || !schedule) {
    return (
      <DriverLayout>
        <div className="container mx-auto p-4">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>
                Could not load the availability schedule.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => navigate("/driver/availability")}>
                Go Back
              </Button>
            </CardFooter>
          </Card>
        </div>
      </DriverLayout>
    );
  }

  return (
    <DriverLayout>
      <div className="container mx-auto p-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Edit Availability Schedule</CardTitle>
            <CardDescription>
              Update your working hours for {getDayName(schedule.dayOfWeek)}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="dayOfWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day of Week</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a day" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">Sunday</SelectItem>
                          <SelectItem value="1">Monday</SelectItem>
                          <SelectItem value="2">Tuesday</SelectItem>
                          <SelectItem value="3">Wednesday</SelectItem>
                          <SelectItem value="4">Thursday</SelectItem>
                          <SelectItem value="5">Friday</SelectItem>
                          <SelectItem value="6">Saturday</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/driver/availability")}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateAvailabilityMutation.isPending}
                  >
                    {updateAvailabilityMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DriverLayout>
  );
}
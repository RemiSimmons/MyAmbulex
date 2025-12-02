import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DriverLayout } from "@/components/layouts/driver-layout";
import { Calendar } from "@/components/ui/calendar";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
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
import { format, parse, isValid } from "date-fns";
import { Loader2, Plus, Trash, Edit } from "lucide-react";

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

// Define type for blocked time
type BlockedTime = {
  id: number;
  driverId: number;
  startDateTime: string;
  endDateTime: string;
  reason: string;
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

// Zod schema for the blocked time form
const blockedTimeFormSchema = z.object({
  startDateTime: z.string(),
  endDateTime: z.string(),
  reason: z.string().min(1, "Reason is required"),
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

// Helper function to format time for display
const formatTime = (time: string) => {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const formattedHour = hour % 12 || 12;
  return `${formattedHour}:${minutes} ${ampm}`;
};

export default function DriverAvailability() {
  const { toast } = useToast();
  const [isAddingAvailability, setIsAddingAvailability] = useState(false);
  const [isAddingBlockedTime, setIsAddingBlockedTime] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<AvailabilitySchedule | null>(null);
  const [selectedBlockedTime, setSelectedBlockedTime] = useState<BlockedTime | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());

  // Fetch availability schedules
  const {
    data: availabilitySchedules = [],
    isLoading: isLoadingSchedules,
    error: schedulesError,
  } = useQuery<AvailabilitySchedule[]>({
    queryKey: ["/api/driver/availability"],
  });

  // Fetch blocked times
  const {
    data: blockedTimes = [],
    isLoading: isLoadingBlockedTimes,
    error: blockedTimesError,
  } = useQuery<BlockedTime[]>({
    queryKey: ["/api/driver/blocked-times"],
  });

  // Form for availability schedules
  const availabilityForm = useForm<z.infer<typeof availabilityFormSchema>>({
    resolver: zodResolver(availabilityFormSchema),
    defaultValues: {
      dayOfWeek: "1", // Monday
      startTime: "09:00",
      endTime: "17:00",
      isRecurring: true,
    },
  });

  // Form for blocked times
  const blockedTimeForm = useForm<z.infer<typeof blockedTimeFormSchema>>({
    resolver: zodResolver(blockedTimeFormSchema),
    defaultValues: {
      startDateTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      endDateTime: format(
        new Date(new Date().getTime() + 2 * 60 * 60 * 1000), // 2 hours later
        "yyyy-MM-dd'T'HH:mm"
      ),
      reason: "",
    },
  });

  // Create availability schedule mutation
  const createAvailabilityMutation = useMutation({
    mutationFn: async (data: z.infer<typeof availabilityFormSchema>) => {
      const response = await apiRequest("POST", "/api/driver/availability", {
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
        title: "Availability schedule created",
        description: "Your availability has been successfully added.",
      });
      setIsAddingAvailability(false);
      availabilityForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create availability",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create blocked time mutation
  const createBlockedTimeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof blockedTimeFormSchema>) => {
      const response = await apiRequest("POST", "/api/driver/blocked-times", {
        startDateTime: new Date(data.startDateTime).toISOString(),
        endDateTime: new Date(data.endDateTime).toISOString(),
        reason: data.reason,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/blocked-times"] });
      toast({
        title: "Blocked time created",
        description: "Your blocked time has been successfully added.",
      });
      setIsAddingBlockedTime(false);
      blockedTimeForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create blocked time",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete availability schedule mutation
  const deleteAvailabilityMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/driver/availability/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/availability"] });
      toast({
        title: "Availability schedule deleted",
        description: "The availability schedule has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete availability",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete blocked time mutation
  const deleteBlockedTimeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/driver/blocked-times/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/blocked-times"] });
      toast({
        title: "Blocked time deleted",
        description: "The blocked time has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete blocked time",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Submit handlers
  const onSubmitAvailability = (values: z.infer<typeof availabilityFormSchema>) => {
    createAvailabilityMutation.mutate(values);
  };

  const onSubmitBlockedTime = (values: z.infer<typeof blockedTimeFormSchema>) => {
    createBlockedTimeMutation.mutate(values);
  };

  // Handle availability schedule deletion
  const handleDeleteAvailability = (id: number) => {
    if (window.confirm("Are you sure you want to delete this availability schedule?")) {
      deleteAvailabilityMutation.mutate(id);
    }
  };

  // Handle blocked time deletion
  const handleDeleteBlockedTime = (id: number) => {
    if (window.confirm("Are you sure you want to delete this blocked time?")) {
      deleteBlockedTimeMutation.mutate(id);
    }
  };

  return (
    <DriverLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Manage Your Availability</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left column - Calendar and availability controls */}
          <div className="lg:col-span-8">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Weekly Availability Schedule</CardTitle>
                <CardDescription>
                  Set your regular working hours for each day of the week
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSchedules ? (
                  <div className="flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : schedulesError ? (
                  <div className="text-center text-red-500">
                    Error loading availability schedules
                  </div>
                ) : (
                  <div className="space-y-4">
                    {availabilitySchedules.length === 0 ? (
                      <p className="text-center text-muted-foreground">
                        No availability schedules found. Add your working hours to receive ride
                        requests.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {availabilitySchedules
                          .sort((a, b) => a.dayOfWeek - b.dayOfWeek) // Sort by day of week: 0 (Sunday) to 6 (Saturday)
                          .map((schedule) => (
                          <div
                            key={schedule.id}
                            className="flex justify-between items-center p-3 border rounded-md hover:bg-secondary/20"
                          >
                            <div>
                              <span className="font-medium">{getDayName(schedule.dayOfWeek)}: </span>
                              <span>
                                {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                              </span>
                              {schedule.isRecurring && (
                                <span className="ml-2 text-sm text-muted-foreground">
                                  (Recurring)
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedSchedule(schedule)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAvailability(schedule.id)}
                              >
                                <Trash className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button onClick={() => setIsAddingAvailability(true)}>
                  <Plus className="mr-1 h-4 w-4" /> Add Availability
                </Button>
              </CardFooter>
            </Card>

            {/* Blocked Times */}
            <Card>
              <CardHeader>
                <CardTitle>Blocked Times</CardTitle>
                <CardDescription>
                  Add specific dates and times when you're unavailable
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingBlockedTimes ? (
                  <div className="flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : blockedTimesError ? (
                  <div className="text-center text-red-500">
                    Error loading blocked times
                  </div>
                ) : (
                  <div className="space-y-4">
                    {blockedTimes.length === 0 ? (
                      <p className="text-center text-muted-foreground">
                        No blocked times found. Add blocked times for periods when you cannot
                        accept rides.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {blockedTimes.map((blockedTime) => (
                          <div
                            key={blockedTime.id}
                            className="flex justify-between items-center p-3 border rounded-md hover:bg-secondary/20"
                          >
                            <div>
                              <div className="font-medium">
                                {format(new Date(blockedTime.startDateTime), "MMM d, yyyy")}
                              </div>
                              <div>
                                {format(new Date(blockedTime.startDateTime), "h:mm a")} -{" "}
                                {format(new Date(blockedTime.endDateTime), "h:mm a")}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {blockedTime.reason}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedBlockedTime(blockedTime)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteBlockedTime(blockedTime.id)}
                              >
                                <Trash className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button onClick={() => setIsAddingBlockedTime(true)}>
                  <Plus className="mr-1 h-4 w-4" /> Add Blocked Time
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Right column - Calendar visualization */}
          <div className="lg:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle>Calendar View</CardTitle>
                <CardDescription>
                  View your schedule at a glance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center mb-4">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="rounded-md border"
                  />
                </div>
                <div className="mt-4">
                  <h3 className="font-medium">
                    {date ? format(date, "MMMM d, yyyy") : "Select a date"}
                  </h3>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {/* We could display availability for the selected date here */}
                    <p>Select a date to view your availability.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Add Availability Dialog */}
      <Dialog open={isAddingAvailability} onOpenChange={setIsAddingAvailability}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Availability Schedule</DialogTitle>
            <DialogDescription>
              Set your regular working hours for a specific day.
            </DialogDescription>
          </DialogHeader>
          <Form {...availabilityForm}>
            <form onSubmit={availabilityForm.handleSubmit(onSubmitAvailability)} className="space-y-4">
              <FormField
                control={availabilityForm.control}
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
                  control={availabilityForm.control}
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
                  control={availabilityForm.control}
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
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddingAvailability(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createAvailabilityMutation.isPending}>
                  {createAvailabilityMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Blocked Time Dialog */}
      <Dialog open={isAddingBlockedTime} onOpenChange={setIsAddingBlockedTime}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Blocked Time</DialogTitle>
            <DialogDescription>
              Set specific dates and times when you're unavailable.
            </DialogDescription>
          </DialogHeader>
          <Form {...blockedTimeForm}>
            <form onSubmit={blockedTimeForm.handleSubmit(onSubmitBlockedTime)} className="space-y-4">
              <FormField
                control={blockedTimeForm.control}
                name="startDateTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date & Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={blockedTimeForm.control}
                name="endDateTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date & Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={blockedTimeForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Personal appointment" {...field} />
                    </FormControl>
                    <FormDescription>
                      Briefly describe why you're unavailable during this time.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddingBlockedTime(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createBlockedTimeMutation.isPending}>
                  {createBlockedTimeMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DriverLayout>
  );
}
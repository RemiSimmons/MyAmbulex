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
import { format, parseISO } from "date-fns";
import { Loader2 } from "lucide-react";

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
const blockedTimeFormSchema = z.object({
  startDateTime: z.string(),
  endDateTime: z.string(),
  reason: z.string().min(1, "Reason is required"),
});

export default function EditBlockedTime() {
  const params = useParams<{ id: string }>();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const id = parseInt(params.id);

  // Fetch blocked time by ID
  const {
    data: blockedTime,
    isLoading,
    error,
  } = useQuery<BlockedTime>({
    queryKey: ["/api/driver/blocked-times", id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/driver/blocked-times/${id}`);
      return await response.json();
    },
  });

  // Form setup
  const form = useForm<z.infer<typeof blockedTimeFormSchema>>({
    resolver: zodResolver(blockedTimeFormSchema),
    defaultValues: {
      startDateTime: "",
      endDateTime: "",
      reason: "",
    },
  });

  // Update form values when blocked time is loaded
  useEffect(() => {
    if (blockedTime) {
      const startDate = parseISO(blockedTime.startDateTime);
      const endDate = parseISO(blockedTime.endDateTime);
      
      form.reset({
        startDateTime: format(startDate, "yyyy-MM-dd'T'HH:mm"),
        endDateTime: format(endDate, "yyyy-MM-dd'T'HH:mm"),
        reason: blockedTime.reason,
      });
    }
  }, [blockedTime, form]);

  // Update blocked time mutation
  const updateBlockedTimeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof blockedTimeFormSchema>) => {
      const response = await apiRequest("PUT", `/api/driver/blocked-times/${id}`, {
        startDateTime: new Date(data.startDateTime).toISOString(),
        endDateTime: new Date(data.endDateTime).toISOString(),
        reason: data.reason,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/blocked-times"] });
      toast({
        title: "Blocked time updated",
        description: "Your changes have been saved successfully.",
      });
      navigate("/driver/availability");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update blocked time",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Submit handler
  const onSubmit = (values: z.infer<typeof blockedTimeFormSchema>) => {
    updateBlockedTimeMutation.mutate(values);
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

  if (error || !blockedTime) {
    return (
      <DriverLayout>
        <div className="container mx-auto p-4">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>
                Could not load the blocked time.
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
            <CardTitle>Edit Blocked Time</CardTitle>
            <CardDescription>
              Update when you're unavailable.
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
                  name="startDateTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date & Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormDescription>
                        When your unavailability begins
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDateTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date & Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormDescription>
                        When your unavailability ends
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Doctor's appointment"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Briefly describe why you're unavailable during this time
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                    disabled={updateBlockedTimeMutation.isPending}
                  >
                    {updateBlockedTimeMutation.isPending && (
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
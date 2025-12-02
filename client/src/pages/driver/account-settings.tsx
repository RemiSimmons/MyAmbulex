import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
// useMutation imported below with other React Query hooks
import { apiRequest } from '@/lib/queryClient';
import Footer from '@/components/layout/footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// Removed Tabs components - now using sidebar navigation
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar,
  Shield,
  AlertTriangle,
  ArrowLeft,
  UserX,
  Key,
  Settings,
  CreditCard,
  Bell
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { StripeConnectOnboarding } from '@/components/driver/StripeConnectOnboarding';
import { Link } from 'wouter';
import { FileText, MapPin, Car, Clock, Info } from 'lucide-react';
import CentralizedDocumentManager from '@/components/driver/centralized-document-manager';
// Using a placeholder for DriverAvailability component - will implement separate availability management
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Loader2, Plus, Trash, Edit } from 'lucide-react';

// Enhanced Availability Schedule Manager Component
function AvailabilityScheduleManager() {
  const { toast } = useToast();
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);

  // Define types to match API response
  type AvailabilitySchedule = {
    id: number;
    driverId: number;
    name: string;
    isRecurring: boolean;
    frequency: string;
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
    startTime: string;
    endTime: string;
    createdAt: string;
    updatedAt: string;
  };

  // Zod schema for flexible day-specific availability form
  const dayTimeSchema = z.object({
    dayOfWeek: z.number().min(0).max(6),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    enabled: z.boolean(),
  });

  const flexibleAvailabilitySchema = z.object({
    schedules: z.array(dayTimeSchema),
    isRecurring: z.boolean().default(true),
  });

  // Helper function to format time for display (12-hour format)
  const formatTimeForDisplay = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  // Generate time options in 15-minute intervals
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = formatTimeForDisplay(timeString);
        times.push({ value: timeString, label: displayTime });
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  // Helper function to get day name from schedule
  const getScheduleDayName = (schedule: AvailabilitySchedule) => {
    if (schedule.monday) return 'Monday';
    if (schedule.tuesday) return 'Tuesday';
    if (schedule.wednesday) return 'Wednesday';
    if (schedule.thursday) return 'Thursday';
    if (schedule.friday) return 'Friday';
    if (schedule.saturday) return 'Saturday';
    if (schedule.sunday) return 'Sunday';
    return 'Unknown';
  };

  // Helper function to get day name
  const getDayName = (dayNumber: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNumber];
  };

  // Days of the week options - MUST match the form schedules array order
  const daysOfWeek = [
    { value: 0, label: 'Sunday' },    // index 0 -> Sunday
    { value: 1, label: 'Monday' },    // index 1 -> Monday  
    { value: 2, label: 'Tuesday' },   // index 2 -> Tuesday
    { value: 3, label: 'Wednesday' }, // index 3 -> Wednesday
    { value: 4, label: 'Thursday' },  // index 4 -> Thursday
    { value: 5, label: 'Friday' },    // index 5 -> Friday
    { value: 6, label: 'Saturday' },  // index 6 -> Saturday
  ];

  // Fetch availability schedules
  const {
    data: availabilitySchedules = [],
    isLoading: isLoadingSchedules,
    error: schedulesError,
  } = useQuery<AvailabilitySchedule[]>({
    queryKey: ['/api/driver/availability'],
  });

  // Form setup
  const form = useForm<z.infer<typeof flexibleAvailabilitySchema>>({
    resolver: zodResolver(flexibleAvailabilitySchema),
    defaultValues: {
      schedules: [
        { dayOfWeek: 0, startTime: "09:00", endTime: "17:00", enabled: false },
        { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", enabled: false },
        { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", enabled: false },
        { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", enabled: false },
        { dayOfWeek: 4, startTime: "09:00", endTime: "17:00", enabled: false },
        { dayOfWeek: 5, startTime: "09:00", endTime: "17:00", enabled: false },
        { dayOfWeek: 6, startTime: "09:00", endTime: "17:00", enabled: false },
      ],
      isRecurring: true,
    },
  });


  // Create availability schedules mutation for multiple days
  const createMultiDayAvailabilityMutation = useMutation({
    mutationFn: async (data: z.infer<typeof flexibleAvailabilitySchema>) => {
      const enabledSchedules = data.schedules.filter(schedule => schedule.enabled);
      const promises = enabledSchedules.map(schedule => {
        const dayName = getDayName(schedule.dayOfWeek);
        return apiRequest('POST', '/api/driver/availability', {
          name: `${dayName} Schedule`,
          isRecurring: data.isRecurring,
          frequency: 'weekly',
          // Set day-specific booleans
          monday: schedule.dayOfWeek === 1,
          tuesday: schedule.dayOfWeek === 2,
          wednesday: schedule.dayOfWeek === 3,
          thursday: schedule.dayOfWeek === 4,
          friday: schedule.dayOfWeek === 5,
          saturday: schedule.dayOfWeek === 6,
          sunday: schedule.dayOfWeek === 0,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
        });
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/driver/availability'] });
      toast({
        title: 'Availability schedules created',
        description: 'Your availability has been successfully added for the selected days.',
      });
      setIsAddingSchedule(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create availability',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete availability schedule mutation
  const deleteAvailabilityMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/driver/availability/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/driver/availability'] });
      toast({
        title: 'Availability schedule deleted',
        description: 'The availability schedule has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete availability',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Submit handler
  const onSubmitAvailability = (values: z.infer<typeof flexibleAvailabilitySchema>) => {
    createMultiDayAvailabilityMutation.mutate(values);
  };

  // Handle delete
  const handleDeleteAvailability = (id: number) => {
    if (window.confirm('Are you sure you want to delete this availability schedule?')) {
      deleteAvailabilityMutation.mutate(id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5" />
          <span>Availability Schedule</span>
        </CardTitle>
        <CardDescription>
          Manage your weekly availability and set working hours for multiple days at once
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Schedules */}
        <div className="space-y-4">
          <h3 className="font-medium">Current Availability</h3>
          {isLoadingSchedules ? (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : schedulesError ? (
            <div className="text-center text-red-500">
              Error loading availability schedules
            </div>
          ) : availabilitySchedules.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No availability schedules found. Add your working hours to receive ride requests.
            </p>
          ) : (
            <div className="space-y-2">
              {availabilitySchedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex justify-between items-center p-3 border rounded-md hover:bg-secondary/20"
                >
                  <div>
                    <span className="font-medium">{getScheduleDayName(schedule)}: </span>
                    <span>
                      {formatTimeForDisplay(schedule.startTime)} - {formatTimeForDisplay(schedule.endTime)}
                    </span>
                    {schedule.isRecurring && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        (Recurring)
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAvailability(schedule.id)}
                  >
                    <Trash className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Schedule */}
        {!isAddingSchedule ? (
          <Button onClick={() => setIsAddingSchedule(true)} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Set Availability
          </Button>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Add Availability Schedule</CardTitle>
              <CardDescription>
                Select multiple days and set working hours for all selected days at once
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitAvailability)} className="space-y-6">
                  {/* Flexible Day-by-Day Schedule */}
                  <div>
                    <FormLabel className="text-base font-semibold">Weekly Schedule</FormLabel>
                    <p className="text-sm text-muted-foreground mb-4">
                      Enable days and set specific times for each day
                    </p>
                    <div className="space-y-3">
                      {daysOfWeek.map((day, index) => (
                        <div key={day.value} className="p-3 border rounded-lg">
                          <div className="flex items-center gap-3 mb-3">
                            <Checkbox
                              checked={form.watch(`schedules.${index}.enabled`)}
                              onCheckedChange={(checked) => {
                                form.setValue(`schedules.${index}.enabled`, !!checked);
                              }}
                            />
                            <Label className="font-medium flex-1">{day.label}</Label>
                          </div>
                          
                          {form.watch(`schedules.${index}.enabled`) && (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 ml-6">
                              <Select 
                                value={form.watch(`schedules.${index}.startTime`)}
                                onValueChange={(value) => form.setValue(`schedules.${index}.startTime`, value)}
                              >
                                <SelectTrigger className="w-full sm:w-28">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                  {timeOptions.map((time) => (
                                    <SelectItem key={time.value} value={time.value}>
                                      {time.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <span className="text-sm text-muted-foreground self-center">to</span>
                              <Select 
                                value={form.watch(`schedules.${index}.endTime`)}
                                onValueChange={(value) => form.setValue(`schedules.${index}.endTime`, value)}
                              >
                                <SelectTrigger className="w-full sm:w-28">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                  {timeOptions.map((time) => (
                                    <SelectItem key={time.value} value={time.value}>
                                      {time.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Selection Buttons */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Quick Setup:</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Weekdays = Monday(1) to Friday(5)
                          [1, 2, 3, 4, 5].forEach(index => {
                            form.setValue(`schedules.${index}.enabled`, true, { shouldValidate: true });
                          });
                          [0, 6].forEach(index => {
                            form.setValue(`schedules.${index}.enabled`, false, { shouldValidate: true });
                          });
                        }}
                      >
                        Weekdays
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Weekends = Saturday(6) and Sunday(0)
                          [6, 0].forEach(index => {
                            form.setValue(`schedules.${index}.enabled`, true, { shouldValidate: true });
                          });
                          [1, 2, 3, 4, 5].forEach(index => {
                            form.setValue(`schedules.${index}.enabled`, false, { shouldValidate: true });
                          });
                        }}
                      >
                        Weekends
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // All Days = all indices 0-6
                          [0, 1, 2, 3, 4, 5, 6].forEach(index => {
                            form.setValue(`schedules.${index}.enabled`, true, { shouldValidate: true });
                          });
                        }}
                      >
                        All Days
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Clear All = disable all indices 0-6
                          [0, 1, 2, 3, 4, 5, 6].forEach(index => {
                            form.setValue(`schedules.${index}.enabled`, false, { shouldValidate: true });
                          });
                        }}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddingSchedule(false);
                        form.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMultiDayAvailabilityMutation.isPending}>
                      {createMultiDayAvailabilityMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Save Schedule
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

function DriverAccountSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [isCancellingMembership, setIsCancellingMembership] = useState(false);

  // Notification preferences state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);

  // Account update state
  const [isUpdatingAccount, setIsUpdatingAccount] = useState(false);
  const [accountForm, setAccountForm] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });

  // Active tab state for sidebar navigation
  const [activeTab, setActiveTab] = useState('account');

  // Service area state
  const [serviceAreas, setServiceAreas] = useState({
    coreAreas: {
      'atlanta-downtown': false,
      'midtown': false,
      'buckhead': false,
      'decatur': false
    } as Record<string, boolean>,
    corridors: {
      'north-northeast-corridor': false,
      'east-southeast-corridor': false,
      'south-southwest-corridor': false,
      'west-northwest-corridor': false
    } as Record<string, boolean>,
    maxDistance: '25'
  });

  // Handle URL hash navigation on component mount
  React.useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && ['account', 'onboarding', 'availability', 'service-area', 'vehicles', 'payments', 'notifications', 'security', 'membership'].includes(hash)) {
      setActiveTab(hash);
    }
  }, []);

  const cancelMembershipMutation = useMutation({
    mutationFn: async (data: { reason: string }) => {
      const response = await apiRequest("POST", "/api/driver/cancel-membership", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to cancel membership");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Membership Cancelled",
        description: "Your driver membership has been cancelled successfully.",
      });
      setShowCancelDialog(false);
      navigate('/');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel membership",
        variant: "destructive",
      });
    },
  });

  const saveServiceAreaMutation = useMutation({
    mutationFn: async (data: typeof serviceAreas) => {
      const response = await apiRequest("PUT", "/api/driver/service-area", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save service area");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Service Area Updated",
        description: "Your service area preferences have been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save service area",
        variant: "destructive",
      });
    },
  });

  const handleServiceAreaSave = () => {
    saveServiceAreaMutation.mutate(serviceAreas);
  };

  const handleCoreAreaChange = (areaId: string, checked: boolean | string) => {
    setServiceAreas(prev => ({
      ...prev,
      coreAreas: {
        ...prev.coreAreas,
        [areaId]: Boolean(checked)
      }
    }));
  };

  const handleCorridorChange = (corridorId: string, checked: boolean | string) => {
    setServiceAreas(prev => ({
      ...prev,
      corridors: {
        ...prev.corridors,
        [corridorId]: Boolean(checked)
      }
    }));
  };

  const handleMaxDistanceChange = (distance: string) => {
    setServiceAreas(prev => ({
      ...prev,
      maxDistance: distance
    }));
  };

  const updateAccountMutation = useMutation({
    mutationFn: async (data: typeof accountForm) => {
      const response = await apiRequest("PUT", "/api/user/profile", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update account");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account Updated",
        description: "Your account information has been updated successfully.",
      });
      setIsUpdatingAccount(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update account",
        variant: "destructive",
      });
      setIsUpdatingAccount(false);
    },
  });

  const handleCancelMembership = async () => {
    if (confirmCancel !== 'CANCEL') {
      toast({
        title: "Confirmation Required",
        description: "Please type 'CANCEL' to confirm membership cancellation",
        variant: "destructive",
      });
      return;
    }

    if (!cancelReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for cancelling your membership",
        variant: "destructive",
      });
      return;
    }

    setIsCancellingMembership(true);
    try {
      await cancelMembershipMutation.mutateAsync({ reason: cancelReason });
    } finally {
      setIsCancellingMembership(false);
    }
  };

  const handleUpdateAccount = async () => {
    setIsUpdatingAccount(true);
    await updateAccountMutation.mutateAsync(accountForm);
  };

  if (!user || user.role !== 'driver') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        {/* Navigation Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/driver/dashboard')}
              className="flex items-center space-x-2 w-fit"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold">Account Settings</h1>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:w-80 flex-shrink-0">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('account')}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === 'account' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <User className="h-5 w-5" />
                <span className="font-medium">Account Information</span>
              </button>
              <button
                onClick={() => setActiveTab('onboarding')}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === 'onboarding' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <FileText className="h-5 w-5" />
                <span className="font-medium">Documents</span>
              </button>
              <button
                onClick={() => setActiveTab('availability')}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === 'availability' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <Clock className="h-5 w-5" />
                <span className="font-medium">Availability</span>
              </button>
              <button
                onClick={() => setActiveTab('service-area')}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === 'service-area' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <MapPin className="h-5 w-5" />
                <span className="font-medium">Service Area</span>
              </button>
              <button
                onClick={() => setActiveTab('vehicles')}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === 'vehicles' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <Car className="h-5 w-5" />
                <span className="font-medium">Vehicles</span>
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === 'payments' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <CreditCard className="h-5 w-5" />
                <span className="font-medium">Payments</span>
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === 'notifications' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <Bell className="h-5 w-5" />
                <span className="font-medium">Notifications</span>
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === 'security' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <Shield className="h-5 w-5" />
                <span className="font-medium">Security</span>
              </button>
              <button
                onClick={() => setActiveTab('membership')}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === 'membership' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <Settings className="h-5 w-5" />
                <span className="font-medium">Membership</span>
              </button>
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">

          {/* Account Information Content */}
          {activeTab === 'account' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Account Information</span>
                </CardTitle>
                <CardDescription>
                  Update your personal information and contact details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={accountForm.fullName}
                      onChange={(e) => setAccountForm(prev => ({ ...prev, fullName: e.target.value }))}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={accountForm.email}
                      onChange={(e) => setAccountForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter your email"
                    />
                    <div className="flex items-center space-x-2">
                      <Badge variant={user.emailVerified ? "default" : "secondary"}>
                        {user.emailVerified ? "Verified" : "Not Verified"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={accountForm.phone}
                      onChange={(e) => setAccountForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter your phone number"
                    />
                    <div className="flex items-center space-x-2">
                      <Badge variant={user.phoneVerified ? "default" : "secondary"}>
                        {user.phoneVerified ? "Verified" : "Not Verified"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Member Since</Label>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={handleUpdateAccount}
                  disabled={isUpdatingAccount}
                  className="w-full md:w-auto"
                >
                  {isUpdatingAccount ? "Updating..." : "Update Account"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Documents & Onboarding Content */}
          {activeTab === 'onboarding' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Profile & Documents</span>
                </CardTitle>
                <CardDescription>
                  Manage your driver profile and update documents as needed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CentralizedDocumentManager 
                  onDocumentChange={() => {}} 
                  uploadedDocuments={{}} 
                />
              </CardContent>
            </Card>
          )}

          {/* Availability Content */}
          {activeTab === 'availability' && (
            <AvailabilityScheduleManager />
          )}

          {/* Service Area Content */}
          {activeTab === 'service-area' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5" />
                  <span>Service Area</span>
                </CardTitle>
                <CardDescription>
                  Choose the corridors where you're available to provide rides
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <TooltipProvider>
                  <div className="space-y-6">
                    {/* Main Metro Areas */}
                    <div>
                      <Label className="text-base font-medium">Atlanta Metro Core Areas</Label>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        {[
                          { id: 'atlanta-downtown', label: 'Atlanta Downtown' },
                          { id: 'midtown', label: 'Midtown' },
                          { id: 'buckhead', label: 'Buckhead' },
                          { id: 'decatur', label: 'Decatur' }
                        ].map((area) => (
                          <div key={area.id} className="flex items-center space-x-2">
                            <Checkbox 
                              id={area.id}
                              checked={serviceAreas.coreAreas[area.id]}
                              onCheckedChange={(checked) => handleCoreAreaChange(area.id, checked)}
                            />
                            <Label htmlFor={area.id} className="text-sm">
                              {area.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Corridor Areas */}
                    <div>
                      <Label className="text-base font-medium">Extended Service Corridors</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        
                        {/* North/Northeast Corridor */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                              <Checkbox 
                                id="north-northeast-corridor"
                                checked={serviceAreas.corridors['north-northeast-corridor']}
                                onCheckedChange={(checked) => handleCorridorChange('north-northeast-corridor', checked)}
                              />
                              <Label htmlFor="north-northeast-corridor" className="text-sm font-medium cursor-pointer">
                                North/Northeast Corridor
                              </Label>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Includes: Johns Creek, Milton, Cumming, Suwanee, Duluth, Lawrenceville, Buford, Sandy Springs, Dunwoody, Doraville, Alpharetta, Roswell, Norcross, Sugar Hill, Flowery Branch, Gainesville</p>
                          </TooltipContent>
                        </Tooltip>

                        {/* East/Southeast Corridor */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                              <Checkbox 
                                id="east-southeast-corridor"
                                checked={serviceAreas.corridors['east-southeast-corridor']}
                                onCheckedChange={(checked) => handleCorridorChange('east-southeast-corridor', checked)}
                              />
                              <Label htmlFor="east-southeast-corridor" className="text-sm font-medium cursor-pointer">
                                East/Southeast Corridor
                              </Label>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Includes: Stone Mountain, Lithonia, Snellville, Loganville, Conyers, Covington, Tucker</p>
                          </TooltipContent>
                        </Tooltip>

                        {/* South/Southwest Corridor */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                              <Checkbox 
                                id="south-southwest-corridor"
                                checked={serviceAreas.corridors['south-southwest-corridor']}
                                onCheckedChange={(checked) => handleCorridorChange('south-southwest-corridor', checked)}
                              />
                              <Label htmlFor="south-southwest-corridor" className="text-sm font-medium cursor-pointer">
                                South/Southwest Corridor
                              </Label>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Includes: College Park, Union City, Fairburn, Fayetteville, Peachtree City, Newnan, East Point, Forest Park, Tyrone, Riverdale, Palmetto</p>
                          </TooltipContent>
                        </Tooltip>

                        {/* West/Northwest Corridor */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                              <Checkbox 
                                id="west-northwest-corridor"
                                checked={serviceAreas.corridors['west-northwest-corridor']}
                                onCheckedChange={(checked) => handleCorridorChange('west-northwest-corridor', checked)}
                              />
                              <Label htmlFor="west-northwest-corridor" className="text-sm font-medium cursor-pointer">
                                West/Northwest Corridor
                              </Label>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Includes: Smyrna, Kennesaw, Woodstock, Acworth, Douglasville, Cartersville, Marietta, Roswell, Mableton, Austell, Powder Springs, Lithia Springs</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    {/* Travel Distance */}
                    <div>
                      <Label htmlFor="max-distance" className="text-base font-medium">Maximum Travel Distance</Label>
                      <Select value={serviceAreas.maxDistance} onValueChange={handleMaxDistanceChange}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select maximum distance you're willing to travel" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 miles</SelectItem>
                          <SelectItem value="25">25 miles</SelectItem>
                          <SelectItem value="50">50 miles</SelectItem>
                          <SelectItem value="75">75 miles</SelectItem>
                          <SelectItem value="100">100 miles</SelectItem>
                          <SelectItem value="unlimited">Unlimited</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Alert>
                      <MapPin className="h-4 w-4" />
                      <AlertDescription>
                        Choose the corridors that best match your preferred service areas. You can select multiple corridors to expand your coverage.
                      </AlertDescription>
                    </Alert>
                  </div>
                </TooltipProvider>
                
                <Button 
                  className="w-full" 
                  onClick={handleServiceAreaSave}
                  disabled={saveServiceAreaMutation.isPending}
                >
                  {saveServiceAreaMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Service Area Settings
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Vehicles Content */}
          {activeTab === 'vehicles' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Car className="h-5 w-5" />
                  <span>Vehicle Management</span>
                </CardTitle>
                <CardDescription>
                  Add and manage your registered vehicles for medical transport
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Alert>
                    <Car className="h-4 w-4" />
                    <AlertDescription>
                      You can add multiple vehicles to your account. Each vehicle must be properly licensed and insured.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <h3 className="font-medium">No vehicles registered</h3>
                      <p className="text-sm text-muted-foreground">
                        Add your first vehicle to start accepting rides
                      </p>
                    </div>
                    <Link href="/driver/add-vehicle">
                      <Button>
                        <Car className="h-4 w-4 mr-2" />
                        Add Vehicle
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Setup Content */}
          {activeTab === 'payments' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Payment Setup</span>
                </CardTitle>
                <CardDescription>
                  Set up your payment account to receive earnings from completed rides
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StripeConnectOnboarding />
              </CardContent>
            </Card>
          )}

          {/* Notifications Content */}
          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Notification Preferences</span>
                </CardTitle>
                <CardDescription>
                  Choose how you want to receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-notifications">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive ride updates and important information via email
                      </p>
                    </div>
                    <Switch
                      id="email-notifications"
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="sms-notifications">SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Get text messages for urgent ride notifications
                      </p>
                    </div>
                    <Switch
                      id="sms-notifications"
                      checked={smsNotifications}
                      onCheckedChange={setSmsNotifications}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="push-notifications">Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive push notifications in your browser
                      </p>
                    </div>
                    <Switch
                      id="push-notifications"
                      checked={pushNotifications}
                      onCheckedChange={setPushNotifications}
                    />
                  </div>
                </div>
                <Button className="w-full md:w-auto">
                  Save Notification Preferences
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Security Content */}
          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Security Settings</span>
                </CardTitle>
                <CardDescription>
                  Manage your account security and password
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <h3 className="font-medium">Password</h3>
                      <p className="text-sm text-muted-foreground">
                        Last updated: Never
                      </p>
                    </div>
                    <Button variant="outline">
                      <Key className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <h3 className="font-medium">Two-Factor Authentication</h3>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <Button variant="outline">
                      Enable 2FA
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Membership Content */}
          {activeTab === 'membership' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Membership Management</span>
                </CardTitle>
                <CardDescription>
                  Manage your driver membership and account status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <h3 className="font-medium">Membership Status</h3>
                      <p className="text-sm text-muted-foreground">
                        Active Driver Account
                      </p>
                    </div>
                    <Badge>Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <h3 className="font-medium">Account Type</h3>
                      <p className="text-sm text-muted-foreground">
                        Professional Driver
                      </p>
                    </div>
                    <Badge variant="secondary">Driver</Badge>
                  </div>
                </div>

                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>Cancel Membership:</strong> This action will permanently deactivate your driver account and cannot be undone.
                  </AlertDescription>
                </Alert>

                <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <UserX className="h-4 w-4 mr-2" />
                      Cancel Membership
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cancel Driver Membership</DialogTitle>
                      <DialogDescription>
                        This action will permanently deactivate your driver account. You will lose access to all driver features and any pending earnings may be affected.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="cancel-reason">Reason for cancellation</Label>
                        <Textarea
                          id="cancel-reason"
                          placeholder="Please tell us why you're cancelling your membership..."
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-cancel">
                          Type "CANCEL" to confirm
                        </Label>
                        <Input
                          id="confirm-cancel"
                          placeholder="Type CANCEL to confirm"
                          value={confirmCancel}
                          onChange={(e) => setConfirmCancel(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                        Keep Membership
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={handleCancelMembership}
                        disabled={isCancellingMembership}
                      >
                        {isCancellingMembership ? "Cancelling..." : "Cancel Membership"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}
        </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

export default DriverAccountSettings;
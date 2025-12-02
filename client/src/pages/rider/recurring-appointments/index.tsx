import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { RecurringAppointment } from "@shared/schema";
import { Loader2, PlusCircle, Calendar, Clock, MapPin, Repeat, MoreVertical, Trash2, Edit, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function RecurringAppointments() {
  const { toast } = useToast();
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<RecurringAppointment | null>(null);
  const [generateRidesDialog, setGenerateRidesDialog] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default to 30 days ahead
  });

  // Fetch recurring appointments
  const { data: appointments, isLoading, error } = useQuery({
    queryKey: ['/api/recurring-appointments'],
    queryFn: async () => {
      const res = await fetch('/api/recurring-appointments');
      if (!res.ok) {
        throw new Error('Failed to fetch recurring appointments');
      }
      return res.json();
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/recurring-appointments/${id}`);
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Appointment deleted",
        description: "The recurring appointment has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/recurring-appointments'] });
      setOpenDeleteDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete appointment: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Generate rides mutation
  const generateRidesMutation = useMutation({
    mutationFn: async ({ id, startDate, endDate }: { id: number, startDate: string, endDate: string }) => {
      const res = await apiRequest('POST', `/api/recurring-appointments/${id}/generate-rides`, {
        startDate,
        endDate
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to generate rides');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Rides generated",
        description: `Successfully generated ${data.rides.length} rides.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/rider/rides'] });
      setGenerateRidesDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to generate rides: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Helper function to format frequency display
  const formatFrequency = (appointment: RecurringAppointment) => {
    let frequency = appointment.frequency.charAt(0).toUpperCase() + appointment.frequency.slice(1);
    
    if (appointment.frequency === 'weekly' && appointment.daysOfWeek) {
      // Convert numerical days to names (0 = Sunday, 1 = Monday, etc.)
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const days = Array.isArray(appointment.daysOfWeek) 
        ? appointment.daysOfWeek.map(day => dayNames[day]).join(', ')
        : '';
      frequency += ` (${days})`;
    } else if (appointment.frequency === 'monthly' && appointment.dayOfMonth) {
      frequency += ` (Day ${appointment.dayOfMonth})`;
    }
    
    return frequency;
  };

  // Handle delete appointment
  const handleDeleteClick = (appointment: RecurringAppointment) => {
    setSelectedAppointment(appointment);
    setOpenDeleteDialog(true);
  };

  // Handle generate rides click
  const handleGenerateRidesClick = (appointment: RecurringAppointment) => {
    setSelectedAppointment(appointment);
    setGenerateRidesDialog(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedAppointment) {
      deleteMutation.mutate(selectedAppointment.id);
    }
  };

  const handleGenerateRidesConfirm = () => {
    if (selectedAppointment) {
      generateRidesMutation.mutate({
        id: selectedAppointment.id,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
    }
  };

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
        <p className="text-destructive mb-4">Error loading recurring appointments</p>
        <Button 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/recurring-appointments'] })}
          variant="outline"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Recurring Appointments</h1>
        <Link href="/rider/recurring-appointments/new">
          <Button className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            <span>New Appointment</span>
          </Button>
        </Link>
      </div>

      {appointments && appointments.length === 0 ? (
        <Card className="mb-8 border-dashed">
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center justify-center gap-2">
              <Calendar className="h-12 w-12 text-muted-foreground mb-2" />
              <h3 className="text-lg font-semibold">No recurring appointments yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-4">
                Set up recurring appointments for your regular medical visits to automatically generate ride requests.
              </p>
              <Link href="/rider/recurring-appointments/new">
                <Button>Create Your First Appointment</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {appointments && appointments.map((appointment: RecurringAppointment) => (
            <Card key={appointment.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{appointment.title}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {format(new Date(appointment.appointmentTime), 'h:mm a')}
                      </span>
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleGenerateRidesClick(appointment)}>
                        <Calendar className="mr-2 h-4 w-4" />
                        Generate Rides
                      </DropdownMenuItem>
                      <Link href={`/rider/recurring-appointments/edit/${appointment.id}`}>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Appointment
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDeleteClick(appointment)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Appointment
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="grid gap-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">From: {appointment.pickupLocation}</p>
                      <p className="text-sm font-medium mt-1">To: {appointment.dropoffLocation}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <p className="text-sm">{formatFrequency(appointment)}</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-2">
                <Badge variant={appointment.active ? "default" : "outline"}>
                  {appointment.active ? "Active" : "Inactive"}
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleGenerateRidesClick(appointment)}
                  className="flex items-center gap-1"
                >
                  <span>Generate Rides</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Recurring Appointment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this recurring appointment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Rides Dialog */}
      <Dialog open={generateRidesDialog} onOpenChange={setGenerateRidesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Ride Requests</DialogTitle>
            <DialogDescription>
              Select a date range to generate ride requests from this recurring appointment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="startDate" className="text-sm font-medium">
                Start Date
              </label>
              <input
                id="startDate"
                type="date"
                className="border rounded-md px-3 py-2"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="endDate" className="text-sm font-medium">
                End Date
              </label>
              <input
                id="endDate"
                type="date"
                className="border rounded-md px-3 py-2"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateRidesDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleGenerateRidesConfirm}
              disabled={generateRidesMutation.isPending}
            >
              {generateRidesMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : "Generate Rides"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
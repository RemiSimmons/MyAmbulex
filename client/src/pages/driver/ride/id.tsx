import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Ride, User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  Calendar,
  Clock,
  MapPin,
  User as UserIcon,
  Phone,
  Mail,
  Car,
  FileText,
  Milestone,
  Loader2
} from "lucide-react";
import { DriverLayout } from "@/components/layouts/driver-layout";
import MapView from "@/components/map-view";

export default function DriverRideDetails() {
  const { id } = useParams();
  const rideId = parseInt(id as string);
  const [, setLocation] = useLocation();
  const navigate = (path: string) => setLocation(path);
  const { user } = useAuth();
  const { toast } = useToast();
  const [rider, setRider] = useState<User | null>(null);
  
  // Fetch ride details
  const { 
    data: ride, 
    isLoading: isLoadingRide,
    error: rideError,
    refetch: refetchRide
  } = useQuery<Ride>({
    queryKey: ['/api/rides', rideId],
    enabled: !!rideId && !!user,
  });
  
  // Fetch rider details when we have the ride
  useEffect(() => {
    if (ride?.riderId) {
      const fetchRider = async () => {
        try {
          const response = await fetch(`/api/users/${ride.riderId}`, {
            credentials: 'include'
          });
          
          if (response.ok) {
            const userData = await response.json();
            setRider(userData);
          }
        } catch (error) {
          console.error("Error fetching rider details:", error);
        }
      };
      
      fetchRider();
    }
  }, [ride]);
  
  // Format date and time
  const formatDate = (date: Date | string) => {
    if (!date) return "N/A";
    const d = new Date(date);
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const formatTime = (date: Date | string) => {
    if (!date) return "N/A";
    const d = new Date(date);
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Helper function to get status badge
  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      requested: "bg-gray-100 text-gray-800 border-gray-200",
      bidding: "bg-blue-100 text-blue-800 border-blue-200",
      scheduled: "bg-purple-100 text-purple-800 border-purple-200",
      paid: "bg-green-100 text-green-800 border-green-200",
      en_route: "bg-yellow-100 text-yellow-800 border-yellow-200 animate-pulse",
      arrived: "bg-indigo-100 text-indigo-800 border-indigo-200",
      in_progress: "bg-orange-100 text-orange-800 border-orange-200",
      completed: "bg-green-100 text-green-800 border-green-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
      edit_pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    };
    
    const statusText: Record<string, string> = {
      requested: "Requested",
      bidding: "Bidding",
      scheduled: "Scheduled",
      paid: "Paid",
      en_route: "En Route",
      arrived: "Arrived",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
      edit_pending: "Edit Pending",
    };
    
    return (
      <Badge 
        variant="outline" 
        className={`font-normal capitalize ${statusStyles[status] || ""}`}
      >
        {statusText[status] || status}
      </Badge>
    );
  };
  
  // Handlers for updating ride status
  const updateRideStatus = async (newStatus: string) => {
    if (!ride) return;
    
    try {
      const response = await fetch(`/api/rides/${ride.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
        credentials: 'include',
      });
      
      if (response.ok) {
        toast({
          title: "Status Updated",
          description: `Ride status changed to ${newStatus.replace('_', ' ')}.`,
        });
        refetchRide();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to update status.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating ride status:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };
  
  const startRide = () => updateRideStatus("en_route");
  const markArrived = () => updateRideStatus("arrived");
  const startTransport = () => updateRideStatus("in_progress");
  const completeRide = () => updateRideStatus("completed");
  
  // If not authenticated or not a driver, show error
  if (!user || user.role !== "driver") {
    return (
      <DriverLayout>
        <div className="flex-grow flex items-center justify-center my-8">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Unauthorized</CardTitle>
              <CardDescription>You need to be logged in as a driver to view ride details.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => navigate("/auth?role=driver")}>
                Login as Driver
              </Button>
            </CardFooter>
          </Card>
        </div>
      </DriverLayout>
    );
  }
  
  // Loading state
  if (isLoadingRide) {
    return (
      <DriverLayout>
        <div className="flex-grow flex items-center justify-center my-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DriverLayout>
    );
  }
  
  // Error state
  if (rideError || !ride) {
    return (
      <DriverLayout>
        <div className="flex-grow flex items-center justify-center my-8">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Ride Not Found</CardTitle>
              <CardDescription>The ride you're looking for doesn't exist or you don't have permission to view it.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => navigate("/driver/dashboard")}>
                Return to Dashboard
              </Button>
            </CardFooter>
          </Card>
        </div>
      </DriverLayout>
    );
  }
  
  return (
    <DriverLayout>
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/driver/dashboard")}
            className="mb-3"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Ride Details</h1>
              <div className="flex items-center mt-1">
                <p className="text-gray-600">#{ride.id} &middot; {formatDate(ride.scheduledTime)}</p>
                <span className="mx-2">•</span>
                {getStatusBadge(ride.status)}
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Ride Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Map View */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Route</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <MapView
                  pickupLocation={
                    ride.pickupLocationLat && ride.pickupLocationLng 
                      ? { lat: ride.pickupLocationLat, lng: ride.pickupLocationLng, label: "Pickup" }
                      : undefined
                  }
                  dropoffLocation={
                    ride.dropoffLocationLat && ride.dropoffLocationLng 
                      ? { lat: ride.dropoffLocationLat, lng: ride.dropoffLocationLng, label: "Dropoff" }
                      : undefined
                  }
                  className="h-64 rounded-lg w-full"
                />
              </CardContent>
            </Card>
            
            {/* Ride Details */}
            <Card>
              <CardHeader>
                <CardTitle>Ride Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Section - Trip Details */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Date & Time</h3>
                    <div className="mt-1 flex items-center">
                      <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                      <p className="font-medium">{formatDate(ride.scheduledTime)}</p>
                    </div>
                    <div className="mt-1 flex items-center">
                      <Clock className="h-5 w-5 text-gray-400 mr-2" />
                      <p className="font-medium">{formatTime(ride.scheduledTime)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Pickup Location</h3>
                    <div className="mt-1 flex items-start">
                      <MapPin className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                      <p className="font-medium">{ride.pickupLocation}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Dropoff Location</h3>
                    <div className="mt-1 flex items-start">
                      <MapPin className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                      <p className="font-medium">{ride.dropoffLocation}</p>
                    </div>
                  </div>
                  
                  {ride.specialInstructions && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Special Instructions</h3>
                      <div className="mt-1 flex items-start">
                        <FileText className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                        <p>{ride.specialInstructions}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Right Section - Trip Requirements */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Rider Information</h3>
                    {rider ? (
                      <>
                        <div className="mt-1 flex items-center">
                          <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <p className="font-medium">{rider.fullName}</p>
                        </div>
                        <div className="mt-1 flex items-center">
                          <Phone className="h-5 w-5 text-gray-400 mr-2" />
                          <p className="font-medium">{rider.phone || 'Not provided'}</p>
                        </div>
                        <div className="mt-1 flex items-center">
                          <Mail className="h-5 w-5 text-gray-400 mr-2" />
                          <p className="font-medium">{rider.email || 'Not provided'}</p>
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-500 mt-1">Loading rider information...</p>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Vehicle Type</h3>
                    <div className="mt-1 flex items-center">
                      <Car className="h-5 w-5 text-gray-400 mr-2" />
                      <p className="font-medium capitalize">{ride.vehicleType}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Trip Requirements</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ride.needsRamp && (
                        <Badge variant="outline">Ramp Needed</Badge>
                      )}
                      {ride.needsWaitTime && (
                        <Badge variant="outline">Wait Time Needed</Badge>
                      )}
                      {ride.pickupStairs && ride.pickupStairs !== "none" && (
                        <Badge variant="outline">
                          Pickup: {ride.pickupStairs.replace("_", " ")} stairs
                        </Badge>
                      )}
                      {ride.dropoffStairs && ride.dropoffStairs !== "none" && (
                        <Badge variant="outline">
                          Dropoff: {ride.dropoffStairs.replace("_", " ")} stairs
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Right Column - Actions and Status */}
          <div className="space-y-6">
            {/* Status Update Card */}
            <Card>
              <CardHeader>
                <CardTitle>Trip Status</CardTitle>
                <CardDescription>Update the status as your trip progresses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Milestone className="h-5 w-5 text-gray-400" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium">Current Status</h3>
                      <p className="text-sm text-gray-600 capitalize">{ride.status.replace('_', ' ')}</p>
                    </div>
                    {getStatusBadge(ride.status)}
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    {ride.status === "scheduled" && (
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={startRide}
                      >
                        Start Ride
                      </Button>
                    )}
                    
                    {ride.status === "en_route" && (
                      <Button 
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                        onClick={markArrived}
                      >
                        Mark as Arrived
                      </Button>
                    )}
                    
                    {ride.status === "arrived" && (
                      <Button 
                        className="w-full bg-orange-600 hover:bg-orange-700"
                        onClick={startTransport}
                      >
                        Start Transport
                      </Button>
                    )}
                    
                    {ride.status === "in_progress" && (
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={completeRide}
                      >
                        Complete Ride
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Location Updater Card - Only show for in-progress rides */}
            {['scheduled', 'en_route', 'arrived', 'in_progress'].includes(ride.status) && (
              <Card>
                <CardHeader>
                  <CardTitle>Location Updates</CardTitle>
                  <CardDescription>Your location is being tracked for this ride</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    Location tracking is enabled to provide riders with real-time updates on your position.
                  </p>
                </CardContent>
              </Card>
            )}
            
            {/* Ride Details Card - Payment Info */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Base Fare</span>
                    <span className="font-medium">${((ride as any).price || 75).toFixed(2)}</span>
                  </div>
                  
                  {ride.estimatedDistance && ride.estimatedDistance > 30 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Distance Fee</span>
                      <span className="font-medium">$15.00</span>
                    </div>
                  )}
                  
                  {ride.needsWaitTime && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Wait Time Fee</span>
                      <span className="font-medium">$15.00</span>
                    </div>
                  )}
                  
                  {(ride.needsRamp || ride.pickupStairs !== "none" || ride.dropoffStairs !== "none") && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Accessibility Fee</span>
                      <span className="font-medium">$10.00</span>
                    </div>
                  )}
                  
                  <Separator className="my-2" />
                  
                  <div className="flex justify-between font-medium">
                    <span>Total Fare</span>
                    <span className="text-lg">${((ride as any).price || 75).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </DriverLayout>
  );
}
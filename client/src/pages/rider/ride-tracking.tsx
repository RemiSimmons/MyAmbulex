import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Calendar, 
  Car, 
  Clock, 
  MapPin, 
  Navigation,
  Coins,
  Phone
} from "lucide-react";
import RideTrackingMap from "@/components/ride-tracking/ride-tracking-map";
import DriverLocationEmulator from "@/components/ride-tracking/driver-location-emulator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";

/**
 * This page provides real-time tracking for an ongoing ride
 */
const RideTrackingPage: React.FC = () => {
  const { rideId } = useParams();
  const rideIdNumber = parseInt(rideId || '0');
  const [, navigate] = useLocation();
  const { user } = useAuth();
  
  // Fetch ride details
  const { data: ride, isLoading, error } = useQuery({
    queryKey: ['/api/rides', rideIdNumber],
    enabled: Boolean(rideIdNumber),
  });
  
  // Fetch driver details if we have a driverId 
  const { data: driver } = useQuery({
    queryKey: ['/api/drivers', ride?.driverId],
    enabled: Boolean(ride?.driverId),
  });
  
  // Helper function to format status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline">Scheduled</Badge>;
      case 'en_route':
        return <Badge variant="warning">Driver En Route</Badge>;
      case 'arrived':
        return <Badge variant="success">Driver Arrived</Badge>;
      case 'in_progress':
        return <Badge variant="default">In Progress</Badge>;
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  // Handle back button
  const handleBack = () => {
    navigate('/rider/dashboard');
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="container max-w-5xl py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-xl font-semibold">Loading ride tracking...</h1>
        </div>
        
        <Skeleton className="w-full h-96 rounded-md" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="w-full h-40 rounded-md" />
          <Skeleton className="w-full h-40 rounded-md" />
        </div>
      </div>
    );
  }
  
  // Render error state
  if (error || !ride) {
    return (
      <div className="container max-w-5xl py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-xl font-semibold">Ride Tracking</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Ride</CardTitle>
            <CardDescription>
              We couldn't load the ride information. The ride may not exist or you may not have permission to view it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBack}>Return to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Ensure the user has permission to view this ride
  const hasPermission = 
    user?.role === 'admin' || 
    (user?.role === 'rider' && user.id === ride.riderId) ||
    (user?.role === 'driver' && user.id === ride.driverId);
  
  if (!hasPermission) {
    return (
      <div className="container max-w-5xl py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-xl font-semibold">Access Denied</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Permission Error</CardTitle>
            <CardDescription>
              You don't have permission to view this ride tracking information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBack}>Return to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container max-w-5xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-xl font-semibold">Ride Tracking</h1>
        </div>
        <div>
          {getStatusBadge(ride.status)}
        </div>
      </div>
      
      <Tabs defaultValue="map" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="map">Map Tracking</TabsTrigger>
          <TabsTrigger value="details">Ride Details</TabsTrigger>
        </TabsList>
        
        <TabsContent value="map" className="space-y-4">
          <RideTrackingMap
            rideId={ride.id}
            pickupAddress={ride.pickupAddress}
            dropoffAddress={ride.dropoffAddress}
            driverId={ride.driverId}
            driverName={driver?.fullName || driver?.username || "Your driver"}
            rideStatus={ride.status}
            scheduledTime={new Date(ride.scheduledTime)}
            className="w-full"
          />
          
          {/* Only show the emulator in development mode and for drivers/admins */}
          {(process.env.NODE_ENV === 'development' && (user?.role === 'admin' || user?.id === ride.driverId)) && (
            <DriverLocationEmulator
              rideId={ride.id}
              driverId={ride.driverId || user.id}
              className="w-full mt-4"
            />
          )}
        </TabsContent>
        
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ride Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Scheduled Time</span>
                  </div>
                  <p>{new Date(ride.scheduledTime).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Coins className="h-4 w-4" />
                    <span>Fare</span>
                  </div>
                  <p>{formatCurrency(ride.fare || 0)}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Pickup Location</span>
                </div>
                <p>{ride.pickupAddress}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Navigation className="h-4 w-4" />
                  <span>Dropoff Location</span>
                </div>
                <p>{ride.dropoffAddress}</p>
              </div>
              
              {ride.specialInstructions && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Special Instructions</span>
                  </div>
                  <p>{ride.specialInstructions}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {driver && (
            <Card>
              <CardHeader>
                <CardTitle>Driver Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Car className="h-4 w-4" />
                      <span>Driver</span>
                    </div>
                    <p>{driver.fullName || driver.username}</p>
                  </div>
                  
                  {driver.phone && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>Contact</span>
                      </div>
                      <p>{driver.phone}</p>
                    </div>
                  )}
                </div>
                
                {/* Add more driver details as needed */}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RideTrackingPage;
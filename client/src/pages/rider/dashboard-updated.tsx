import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket, RideStatusUpdate } from "@/context/websocket-context";

import Footer from "@/components/layout/footer";
import RideRequestCard from "@/components/ride-request-card";
import CondensedRideRequestCard from "@/components/condensed-ride-request-card";
import { RideStatusNotification } from "@/components/ride-status-notification";
import RatingDialog from "@/components/rating-dialog";
import { Ride, Bid } from "@shared/schema";
import { RideTemplatesModal } from "@/components/rides/ride-templates-modal";
import { useRider } from "@/context/rider-context";

export default function RiderDashboard() {
  const { user } = useAuth();
  const { startTrackingRide, stopTrackingRide, latestStatusUpdate, clearStatusUpdate } = useWebSocket();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [rideToRate, setRideToRate] = useState<number | null>(null);

  const { data: rides, isLoading: isLoadingRides } = useQuery<Ride[]>({
    queryKey: ["/api/rides"],
    enabled: !!user,
  });

  const upcomingRides = rides?.filter(
    ride => ["scheduled", "en_route", "arrived", "in_progress"].includes(ride.status)
  ) || [];

  const pastRides = rides?.filter(
    ride => ["completed", "cancelled"].includes(ride.status)
  ) || [];

  const activeRequests = rides?.filter(
    ride => ["requested", "bidding", "edit_pending"].includes(ride.status)
  ) || [];

  // Combine each active request with its bids
  const [requestsWithBids, setRequestsWithBids] = useState<Map<number, Bid[]>>(new Map());
  
  // Fetch bids for active requests with proper controls to prevent infinite loops
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const fetchBidsWithDelay = () => {
      // Add delay to prevent rapid successive calls
      timeoutId = setTimeout(async () => {
        if (!isMounted || !activeRequests?.length) return;
        
        const newMap = new Map<number, Bid[]>();
        
        // Fetch bids for each active request with proper error handling
        for (const request of activeRequests) {
          if (!isMounted) return;
          
          try {
            const response = await fetch(`/api/bids/ride/${request.id}`, {
              credentials: "include",
            });
            
            if (response.ok) {
              const bids = await response.json();
              if (Array.isArray(bids)) {
                newMap.set(request.id, bids);
              }
            } else if (response.status === 401) {
              // Stop on auth errors
              console.log("Authentication error when fetching bids");
              return;
            }
          } catch (error) {
            console.error("Error fetching bids for ride", request.id, error);
          }
        }
        
        if (isMounted) {
          setRequestsWithBids(newMap);
        }
      }, 1000); // 1 second delay to prevent rapid calls
    };

    fetchBidsWithDelay();
    
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [activeRequests]);

  // Create a stable reference for tracking state
  const trackingStateRef = React.useRef({
    isTracking: false,
    trackedRides: new Set<number>(),
    currentTab: activeTab
  });
  
  // Effect that runs only once to set up tracking logic
  useEffect(() => {
    // Function to start tracking rides that executes when needed
    const startTrackingUpcomingRides = () => {
      const state = trackingStateRef.current;
      
      // Only proceed if we're on the upcoming tab and not already tracking
      if (state.currentTab !== "upcoming" || state.isTracking) {
        return;
      }
      
      // Get trackable ride IDs
      const rideIdsToTrack = upcomingRides
        .filter(ride => ["scheduled", "en_route", "arrived", "in_progress"].includes(ride.status))
        .map(ride => ride.id);
      
      // No rides to track
      if (rideIdsToTrack.length === 0) {
        return;
      }
      
      console.log("Starting to track upcoming rides for real-time updates");
      state.isTracking = true;
      
      // Start tracking each ride
      rideIdsToTrack.forEach(rideId => {
        if (!state.trackedRides.has(rideId)) {
          state.trackedRides.add(rideId);
          startTrackingRide(rideId);
          console.log(`Tracking ride ${rideId}`);
        }
      });
    };
    
    // Function to stop tracking all rides
    const stopTrackingAllRides = () => {
      const state = trackingStateRef.current;
      if (!state.isTracking) {
        return;
      }
      
      console.log("Stopping tracking for all rides");
      state.trackedRides.forEach(rideId => {
        stopTrackingRide(rideId);
        console.log(`Stopped tracking ride ${rideId}`);
      });
      
      state.trackedRides.clear();
      state.isTracking = false;
    };
    
    // Update tracking when tab changes
    if (activeTab !== trackingStateRef.current.currentTab) {
      if (trackingStateRef.current.isTracking) {
        stopTrackingAllRides();
      }
      trackingStateRef.current.currentTab = activeTab;
    }
    
    // Start tracking if we're on the upcoming tab
    if (activeTab === "upcoming") {
      startTrackingUpcomingRides();
    }
    
    // Cleanup on component unmount
    return () => {
      if (trackingStateRef.current.isTracking) {
        stopTrackingAllRides();
      }
    };
  }, [activeTab, upcomingRides]);
  
  
  // Handler for rating a ride after it's completed
  const handleRateDriver = async (rideId: number, rating: number, comment: string) => {
    try {
      const response = await fetch(`/api/rides/${rideId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ rating, comment }),
      });
      
      if (response.ok) {
        setShowRatingDialog(false);
        setRideToRate(null);
      } else {
        console.error("Failed to submit rating");
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
    }
  };
  
  // Handle when the rider wants to rate the driver (when a ride is completed)
  const handleOpenRatingDialog = (rideId: number) => {
    setRideToRate(rideId);
    setShowRatingDialog(true);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Access the ride templates modal state from the context
  const { isTemplateModalOpen, openTemplateModal, closeTemplateModal } = useRider();
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      
      {/* Ride Status Notifications - will show when driver updates status */}
      {latestStatusUpdate && (
        <RideStatusNotification
          status={latestStatusUpdate.newStatus as "en_route" | "arrived" | "completed" | null}
          driver={latestStatusUpdate.driverInfo}
          onClose={clearStatusUpdate}
          onRateDriver={() => {
            if (latestStatusUpdate.rideId) {
              handleOpenRatingDialog(latestStatusUpdate.rideId);
            }
            clearStatusUpdate();
          }}
        />
      )}
      
      {/* Rating Dialog - shows when a ride is completed */}
      {showRatingDialog && rideToRate && (
        <RatingDialog
          open={showRatingDialog}
          onOpenChange={setShowRatingDialog}
          onSubmit={(rating, comment) => handleRateDriver(rideToRate, rating, comment)}
        />
      )}
      
      {/* Ride Templates Modal - shows for first-time users automatically */}
      <RideTemplatesModal 
        open={isTemplateModalOpen} 
        onOpenChange={(open) => open ? openTemplateModal() : closeTemplateModal()}
      />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Rider Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user.fullName}</p>
          </div>
          
          <Link href="/rider/book-ride">
            <Button size="lg" className="bg-primary hover:bg-primary/90">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Book a Ride
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="upcoming">
                  Upcoming Rides
                  {upcomingRides.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{upcomingRides.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="requests">
                  Active Requests
                  {activeRequests.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{activeRequests.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="past">
                  Past Rides
                  {pastRides.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{pastRides.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="upcoming" className="space-y-4">
                {isLoadingRides ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : upcomingRides.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <p className="text-gray-600 mb-4">You don't have any upcoming rides.</p>
                      <Link href="/rider/book-ride">
                        <Button>Book a Ride</Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  upcomingRides.map(ride => (
                    <CondensedRideRequestCard 
                      key={ride.id} 
                      ride={ride} 
                      viewType="rider"
                      showPrice={true}
                      onSelect={(ride) => {
                        setLocation(`/rider/ride/${ride.id}`);
                      }}
                    />
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="requests" className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Active Ride Requests</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
                      // Also invalidate bids to ensure we have the latest information
                      activeRequests.forEach(request => {
                        queryClient.invalidateQueries({ queryKey: [`/api/rides/${request.id}/bids`] });
                      });
                    }}
                    disabled={isLoadingRides}
                    className="flex items-center"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-4 w-4 mr-2 ${isLoadingRides ? 'animate-spin' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                      />
                    </svg>
                    {isLoadingRides ? 'Refreshing...' : 'Refresh Requests'}
                  </Button>
                </div>
                
                {isLoadingRides ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : activeRequests.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <p className="text-gray-600 mb-4">You don't have any active ride requests.</p>
                      <Link href="/rider/book-ride">
                        <Button>Create a Request</Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  activeRequests.map(request => (
                    <CondensedRideRequestCard 
                      key={request.id} 
                      ride={request} 
                      bids={requestsWithBids.get(request.id) || []}
                      viewType="rider"
                      showPrice={true}
                      onSelect={(ride) => {
                        // Navigate to ride details page, or handle as needed
                        setLocation(`/rider/ride/${ride.id}`);
                      }}
                    />
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="past" className="space-y-4">
                {isLoadingRides ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : pastRides.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      <p className="text-gray-600 mb-4">You don't have any past rides.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Past Rides</h3>
                    </div>
                    {pastRides.map(ride => (
                      <CondensedRideRequestCard 
                        key={ride.id} 
                        ride={ride} 
                        viewType="rider"
                        showPrice={true}
                        onSelect={(ride) => {
                          setLocation(`/rider/ride/${ride.id}`);
                        }}
                      />
                    ))}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Right Column / Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Get Help */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Need Assistance?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">Our support team is here to help with any questions about your ride requests.</p>
                <Link href="/help">
                  <Button variant="outline" className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    View Help Center
                  </Button>
                </Link>
              </CardContent>
            </Card>
            
            {/* Saved Templates */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Saved Ride Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Save time by creating templates for your frequent trips.
                </p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => openTemplateModal()}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                  </svg>
                  Manage Templates
                </Button>
              </CardContent>
            </Card>
            
            {/* Recurring Appointments */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Recurring Appointments</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Set up automatic ride requests for your regular appointments.
                </p>
                <Link href="/rider/recurring-appointments">
                  <Button variant="outline" className="w-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                    View Appointments
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
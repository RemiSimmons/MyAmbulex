import React, { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
// WebSocket removed - using polling system instead
import Footer from "@/components/layout/footer";
import RideRequestCard from "@/components/ride-request-card";
import CondensedRideRequestCard from "@/components/condensed-ride-request-card";
// Status notifications handled by polling system
import RatingDialog from "@/components/rating-dialog";
import { Ride, Bid } from "@shared/schema";
import { RideTemplatesModal } from "@/components/rides/ride-templates-modal";
import { useRider } from "@/context/rider-context";
import { usePolling } from "@/context/polling-context";

export default function RiderDashboard() {
  const { user } = useAuth();
  const { startTrackingRide, stopTrackingRide } = usePolling();
  // WebSocket tracking removed - polling system handles all updates
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [rideToRate, setRideToRate] = useState<number | null>(null);
  
  // Tracking state ref for ride monitoring
  const trackingStateRef = useRef({
    trackedRides: new Set<number>(),
    isTracking: false,
    currentTab: '',
    lastRidesKey: ''
  });

  const { data: rides, isLoading: isLoadingRides } = useQuery<Ride[]>({
    queryKey: ["/api/rides"],
    enabled: !!user,
  });

  const upcomingRides = rides?.filter(
    ride => ["accepted", "scheduled", "payment_pending", "en_route", "arrived", "in_progress"].includes(ride.status)
  ) || [];

  const pastRides = rides?.filter(
    ride => ["completed", "cancelled"].includes(ride.status)
  ) || [];

  const activeRequests = rides?.filter(
    ride => ["requested", "bidding", "edit_pending"].includes(ride.status)
  ) || [];

  // Fetch bids for active requests
  const { data: allBids } = useQuery<Record<string, Bid[]>>({
    queryKey: ["/api/rides/bids", activeRequests.map(r => r.id)],
    queryFn: async () => {
      const bidsMap: Record<string, Bid[]> = {};
      for (const request of activeRequests) {
        try {
          const response = await fetch(`/api/bids/ride/${request.id}`, {
            credentials: 'include'
          });
          if (response.ok) {
            const bids = await response.json();
            console.log(`✅ Successfully fetched ${bids?.length || 0} bids for ride ${request.id}:`, bids);
            bidsMap[request.id] = Array.isArray(bids) ? bids : [];
          } else {
            console.error(`❌ Failed to fetch bids for ride ${request.id}: ${response.status} ${response.statusText}`);
            bidsMap[request.id] = [];
          }
        } catch (error) {
          console.error(`Failed to fetch bids for ride ${request.id}:`, error);
          bidsMap[request.id] = [];
        }
      }
      return bidsMap;
    },
    enabled: !!user && activeRequests.length > 0,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const requestsWithBids = new Map<number, Bid[]>();
  if (allBids) {
    Object.entries(allBids).forEach(([rideId, bids]) => {
      requestsWithBids.set(parseInt(rideId), bids);
    });
  }

  // Polling system handles all updates automatically

  // Effect that runs only for initial setup and significant changes
  useEffect(() => {
    const state = trackingStateRef.current;

    // Function to efficiently update tracking
    const updateTracking = () => {
      // Skip if not on the upcoming tab
      if (activeTab !== "upcoming") {
        // If we were tracking and now switched tabs, stop all tracking
        if (state.isTracking) {
          console.log("Leaving upcoming tab, stopping all ride tracking");
          state.trackedRides.forEach(rideId => {
            stopTrackingRide(rideId);
          });
          state.trackedRides.clear();
          state.isTracking = false;
        }
        return;
      }

      // Get the current set of rides that should be tracked
      const shouldTrackRideIds = new Set(
        upcomingRides
          .filter(ride => ["scheduled", "en_route", "arrived", "in_progress"].includes(ride.status))
          .map(ride => ride.id)
      );

      // Stop tracking rides that are no longer in the tracking set
      const ridesToRemove = Array.from(state.trackedRides).filter(id => !shouldTrackRideIds.has(id));
      ridesToRemove.forEach(rideId => {
        stopTrackingRide(rideId);
        state.trackedRides.delete(rideId);
        console.log(`Stopped tracking ride ${rideId} (no longer relevant)`);
      });

      // Start tracking new rides
      const ridesToAdd = Array.from(shouldTrackRideIds).filter(id => !state.trackedRides.has(id));
      if (ridesToAdd.length > 0) {
        console.log(`Starting to track ${ridesToAdd.length} new upcoming rides`);
        ridesToAdd.forEach(rideId => {
          startTrackingRide(rideId);
          state.trackedRides.add(rideId);
        });
      }

      // Update tracking status
      state.isTracking = state.trackedRides.size > 0;
      state.currentTab = activeTab;
    };

    // Calculate a stable key that only changes when underlying data really changes
    // This prevents repeated tracking events during re-renders
    const ridesKey = upcomingRides.map(ride => `${ride.id}-${ride.status}`).join(',');

    // Store this key to detect real changes
    if (state.lastRidesKey !== ridesKey || state.currentTab !== activeTab) {
      state.lastRidesKey = ridesKey;
      updateTracking();
    }

    // Cleanup on component unmount
    return () => {
      if (state.isTracking) {
        console.log("Component unmounting, cleaning up ride tracking");
        state.trackedRides.forEach(rideId => {
          stopTrackingRide(rideId);
        });
        state.trackedRides.clear();
        state.isTracking = false;
      }
    };
  }, [activeTab, upcomingRides, startTrackingRide, stopTrackingRide]);


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

      {/* Status notifications handled by polling system */}

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

      <main className="flex-grow container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 sm:mb-8 gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Rider Dashboard</h1>
            <p className="text-sm sm:text-base text-gray-600">Welcome back, {user.fullName}</p>
          </div>

          <Link href="/rider/book-ride">
            <Button size="lg" className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Book a Ride
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 mb-4 sm:mb-6 overflow-visible min-h-[40px] sm:min-h-[45px] text-xs sm:text-sm md:text-base">
                <TabsTrigger value="upcoming" className="px-1 sm:px-2 md:px-4 py-2 flex justify-center items-center text-xs sm:text-sm">
                  <span className="whitespace-nowrap">Upcoming</span>
                  {upcomingRides.length > 0 && (
                    <Badge variant="secondary" className="ml-1 sm:ml-2 min-w-[1.2rem] sm:min-w-[1.5rem] text-center text-xs">{upcomingRides.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="requests" className="px-1 sm:px-2 md:px-4 py-2 flex justify-center items-center text-xs sm:text-sm">
                  <span className="whitespace-nowrap">Requests</span>
                  {activeRequests.length > 0 && (
                    <Badge variant="secondary" className="ml-1 sm:ml-2 min-w-[1.2rem] sm:min-w-[1.5rem] text-center text-xs">{activeRequests.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="past" className="px-1 sm:px-2 md:px-4 py-2 flex justify-center items-center text-xs sm:text-sm">
                  <span className="whitespace-nowrap">Past</span>
                  {pastRides.length > 0 && (
                    <Badge variant="secondary" className="ml-1 sm:ml-2 min-w-[1.2rem] sm:min-w-[1.5rem] text-center text-xs">{pastRides.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                  <h3 className="text-lg font-medium mb-2 sm:mb-0">Upcoming Rides</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
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
                    {isLoadingRides ? 'Refreshing...' : 'Refresh'}
                  </Button>
                </div>

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
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                  <h3 className="text-lg font-medium mb-2 sm:mb-0">Active Ride Requests</h3>
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
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                  <h3 className="text-lg font-medium mb-2 sm:mb-0">Past Rides</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
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
                    {isLoadingRides ? 'Refreshing...' : 'Refresh'}
                  </Button>
                </div>

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
                      <p className="text-gray-600">You don't have any past rides yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  pastRides.map(ride => (
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
            </Tabs>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  <Link href="/rider/book-ride">
                    <Button variant="outline" className="w-full justify-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Book New Ride
                    </Button>
                  </Link>
                  <Link href="/rider/saved-locations">
                    <Button variant="outline" className="w-full justify-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      Saved Locations
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full justify-start" onClick={openTemplateModal}>
                    <FileText className="h-5 w-5 mr-2" />
                    Ride Templates
                  </Button>
                  <Link href="/rider/get-support" className="w-full">
                    <Button variant="outline" className="w-full justify-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      Get Support
                    </Button>
                  </Link>
                  <Link href="/rider/account-settings" className="w-full">
                    <Button variant="outline" className="w-full justify-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                      Account Settings
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Saved Locations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="font-medium">Home</p>
                        <p className="text-xs text-gray-500">123 Main Street</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </Button>
                  </div>

                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                      </svg>
                      <div>
                        <p className="font-medium">Lakeside Medical Clinic</p>
                        <p className="text-xs text-gray-500">456 Lakefront Dr</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </Button>
                  </div>

                  <div className="flex items-center justify-between pb-2">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                      </svg>
                      <div>
                        <p className="font-medium">Memorial Hospital</p>
                        <p className="text-xs text-gray-500">789 Memorial Ave</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </Button>
                  </div>

                  <Link href="/rider/saved-locations">
                    <Button variant="outline" className="w-full mt-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Add New Location
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
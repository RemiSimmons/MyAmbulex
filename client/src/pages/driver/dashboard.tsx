import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import StatCard from "@/components/stat-card";
import RideRequestCard from "@/components/ride-request-card";
import { Ride, Bid, DriverDetails, Vehicle } from "@shared/schema";
import { ComprehensiveDriverDashboard } from "@/components/driver/comprehensive-dashboard";
import { format } from "date-fns";
import { formatDate } from "@/lib/utils";
import { 
  Loader2, 
  ChevronRight, 
  Clock, 
  CalendarDays, 
  DollarSign,
  Map, 
  ArrowLeftRight,
  History,
  RefreshCw,
  Car,
  User,
  CheckCircle,
  Check,
  X,
  FileText
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { CounterOfferForm } from "@/components/counter-offer-form";
import { StripeConnectOnboarding } from "@/components/driver/StripeConnectOnboarding";
import { LegalAgreementsPopup } from "@/components/legal-agreements-popup";
import { useCompletionStatus } from "@/hooks/use-legal-agreements";

export default function DriverDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("available");
  const [counterOfferBid, setCounterOfferBid] = useState<Bid | null>(null);
  const [showBidHistory, setShowBidHistory] = useState(false);
  const [bidHistory, setBidHistory] = useState<Bid[]>([]);
  const [isLoadingBidHistory, setIsLoadingBidHistory] = useState(false);
  const [showLegalPopup, setShowLegalPopup] = useState(false);

  // Check legal agreement completion status for drivers
  const { data: legalStatus, isLoading: isLoadingLegal } = useCompletionStatus();

  // Show legal popup for drivers who haven't completed all required documents
  useEffect(() => {
    if (user?.role === "driver" && legalStatus && !legalStatus.isComplete && !showLegalPopup) {
      setShowLegalPopup(true);
    }
  }, [user, legalStatus, showLegalPopup]);

  // Fetch available ride requests for this driver
  const { data: rideRequests, isLoading: isLoadingRides } = useQuery<Ride[]>({
    queryKey: ["/api/driver/available-rides"],
    enabled: !!user && user.role === "driver",
    refetchInterval: 5000, // Poll every 5 seconds to ensure fresh data
    staleTime: 0, // Always consider data stale to force refetching
  });

  // Fetch driver's rides
  const { data: driverRides, isLoading: isLoadingDriverRides } = useQuery<Ride[]>({
    queryKey: ["/api/rides"],
    enabled: !!user && user.role === "driver",
  });

  // Fetch driver's bids
  const { data: driverBids, isLoading: isLoadingBids } = useQuery<Bid[]>({
    queryKey: ["/api/driver/bids"],
    enabled: !!user && user.role === "driver",
    refetchInterval: 5000, // Poll every 5 seconds to see new counter offers
    staleTime: 0, // Always consider data stale to force refetching
  });

  // Fetch driver details
  const { data: driverDetails, isLoading: isLoadingDetails } = useQuery<DriverDetails>({
    queryKey: ["/api/driver/details"],
    enabled: !!user && user.role === "driver",
  });

  // Fetch driver's vehicles
  const { data: vehicles, isLoading: isLoadingVehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    enabled: !!user && user.role === "driver",
  });

  // Available rides are already filtered by the server endpoint
  // The /api/driver/available-rides endpoint returns rides that:
  // - Have status "requested" or "bidding" 
  // - Don't have an assigned driver yet
  // - Are available for this driver to bid on (excludes rides where driver already has bids)
  const availableRides = rideRequests || [];
  
  // Debug logging for ride filtering
  console.log('🚗 Available rides data:', {
    rideRequestsLength: rideRequests?.length || 0,
    availableRidesLength: availableRides.length,
    timestamp: new Date().toISOString()
  });

  // Get edit_pending rides specifically for the driver to review
  const editPendingRides = driverRides?.filter(
    ride => ride.status === "edit_pending"
  ) || [];

  const scheduledRides = driverRides?.filter(
    ride => ["scheduled", "paid", "en_route", "arrived", "in_progress"].includes(ride.status)
  ) || [];

  const completedRides = driverRides?.filter(
    ride => ride.status === "completed"
  ) || [];

  // Filter bids - include pending bids, selected counter offers, and accepted bids
  // For counter offer chains, only show the most recent bid
  const allPendingBids = driverBids?.filter(
    bid => bid.status === "pending" || bid.status === "selected" || bid.status === "accepted"
  ) || [];
  
  // Group bids by ride and only keep the most recent bid for each ride
  const bidsByRide = allPendingBids.reduce((acc, bid) => {
    const rideId = bid.rideId;
    if (!acc[rideId] || bid.createdAt > acc[rideId].createdAt) {
      acc[rideId] = bid;
    }
    return acc;
  }, {} as Record<number, any>);
  
  const pendingBids = Object.values(bidsByRide);
  
  // Debug logging for bid filtering
  console.log('🔍 DEBUG BID FILTERING:', {
    allPendingBidsCount: allPendingBids.length,
    finalPendingBidsCount: pendingBids.length,
    allBids: allPendingBids.map(b => `ID:${b.id} Amount:$${b.amount} RideID:${b.rideId} Status:${b.status}`),
    finalBids: pendingBids.map(b => `ID:${b.id} Amount:$${b.amount} RideID:${b.rideId} Status:${b.status}`)
  });

  // Calculate earnings
  const totalEarnings = completedRides.reduce((total, ride) => total + (ride.finalPrice || 0), 0);

  // Functions to handle counter-offers and bid history
  const handleShowCounterOffer = (bid: Bid) => {
    setCounterOfferBid(bid);
  };

  const handleWithdrawBid = async (bid: Bid) => {
    try {
      const response = await apiRequest("DELETE", `/api/bids/${bid.id}`, {});
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to withdraw bid");
      }
      
      toast({
        title: "Bid Withdrawn",
        description: "Your bid has been successfully withdrawn.",
      });
      
      // Refresh data to update both available rides and bids lists
      queryClient.invalidateQueries({ queryKey: ["/api/driver/bids"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/available-rides"] });
      console.log('🔄 Cache invalidated after bid withdrawal');
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to withdraw the bid",
        variant: "destructive",
      });
    }
  };

  const handleAcceptBid = async (bid: Bid) => {
    try {
      const response = await apiRequest("POST", `/api/bids/${bid.id}/driver-accept`, {});
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to accept bid");
      }
      
      toast({
        title: "Bid Accepted",
        description: "You've accepted the rider's offer. The ride is now scheduled.",
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/driver/bids"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/available-rides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to accept the bid",
        variant: "destructive",
      });
    }
  };



  const handleCounterOfferSuccess = () => {
    setCounterOfferBid(null);
    toast({
      title: "Counter-offer submitted",
      description: "Your counter-offer has been sent to the rider.",
    });
  };

  const handleShowBidHistory = async (bid: Bid) => {
    setShowBidHistory(true);
    setIsLoadingBidHistory(true);

    try {
      const res = await fetch(`/api/bids/${bid.id}/history`);
      if (!res.ok) {
        throw new Error('Failed to fetch bid history');
      }

      const historyData = await res.json();
      setBidHistory(historyData);
    } catch (error) {
      console.error('Error fetching bid history:', error);
      toast({
        title: "Error",
        description: "Failed to load bid history.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingBidHistory(false);
    }
  };

  // Loading state
  const isLoading = isLoadingRides || isLoadingDriverRides || isLoadingBids || isLoadingDetails || isLoadingVehicles;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if driver details and vehicle info are complete
  const isProfileComplete = driverDetails && vehicles && vehicles.length > 0;

  // Determine if driver has pending application
  const hasPendingApplication = !driverDetails?.verified && isProfileComplete;

  // Removed automatic redirect to comprehensive dashboard
  // Users can access it via the Settings button

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-grow container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 sm:mb-8 gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Driver Dashboard</h1>
            <p className="text-sm sm:text-base text-gray-600">Welcome back, {user.username}</p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Link href="/driver/account" className="flex-1 sm:flex-none">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                Settings
              </Button>
            </Link>
            {driverDetails?.accountStatus === 'active' ? (
              <Badge className="bg-green-100 text-green-800 font-normal text-xs sm:text-sm">Active</Badge>
            ) : (
              <Badge className="bg-yellow-100 text-yellow-800 font-normal text-xs sm:text-sm">Pending Verification</Badge>
            )}
          </div>
        </div>

        {/* Show pending application notice */}
        {hasPendingApplication && (
          <Card className="mb-8 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5 text-yellow-600" />
                Application Under Review
              </CardTitle>
              <CardDescription>
                Your driver application is currently being reviewed by our team. This process typically takes 1-3 business days.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                While your application is being reviewed, you can explore the dashboard, but you won't be able to bid on 
                rides until your application is approved. We'll notify you as soon as your application status changes.
              </p>
            </CardContent>
          </Card>
        )}

        {!isProfileComplete && driverDetails?.accountStatus !== 'active' ? (
          <Card className="mb-8">
            <CardHeader className="pb-3">
              <CardTitle>Complete Your Profile</CardTitle>
              <CardDescription>
                Please complete your profile information to start accepting rides.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Direct link to the onboarding process */}
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center mb-3">
                    <div className="bg-blue-100 rounded-full p-2 mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Check Application Status</p>
                      <p className="text-sm text-gray-500">Resume your driver application process</p>
                    </div>
                  </div>
                  <Link href={driverDetails?.accountStatus === 'active' ? "/driver/account" : "/driver/onboarding"}>
                    <Button className="w-full sm:w-auto">
                      {driverDetails?.accountStatus === 'active' ? 'Manage Documents' : 'Go to Onboarding'}
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>

                {(!vehicles || vehicles.length === 0) && (
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center mb-3">
                      <div className="bg-yellow-100 rounded-full p-2 mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                          <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H11a1 1 0 001-1v-5h2v5a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H19a1 1 0 001-1v-5a1 1 0 00-.293-.707L17 6.586V4a1 1 0 00-1-1H3z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium">Vehicle Information</p>
                        <p className="text-sm text-gray-500">Add details about your vehicle(s)</p>
                      </div>
                    </div>
                    <Link href="/driver/add-vehicle">
                      <Button className="w-full sm:w-auto">
                        Add Vehicle
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <StatCard 
            title="Pending Bids" 
            value={pendingBids.length}
            icon={<Clock className="h-5 w-5" />}
            loading={isLoading}
            onClick={() => setActiveTab("bids")}
            hoverEffect={true}
          />
          <StatCard 
            title="Scheduled Rides" 
            value={scheduledRides.length}
            icon={<CalendarDays className="h-5 w-5" />}
            loading={isLoading}
            onClick={() => setActiveTab("scheduled")}
            hoverEffect={true}
          />
          <StatCard 
            title="Completed Rides" 
            value={completedRides.length}
            change={completedRides.length > 0 ? { value: 12, trend: "up", label: "this month" } : undefined}
            icon={<Map className="h-5 w-5" />}
            loading={isLoading}
            onClick={() => {
              // If a dedicated tab for completed rides exists, navigate there
              // For now, we'll navigate to "scheduled" since completed rides might appear there
              setActiveTab("scheduled");
            }}
            hoverEffect={true}
          />
          <StatCard 
            title="Total Earnings" 
            value={`$${totalEarnings.toFixed(2)}`}
            change={totalEarnings > 0 ? { value: 8, trend: "up", label: "this month" } : undefined}
            icon={<DollarSign className="h-5 w-5" />}
            loading={isLoading}
            // For earnings, we could navigate to a financial page if one exists
            // For now, we'll either keep it non-clickable or navigate to a relevant tab
            hoverEffect={true}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 mb-4 sm:mb-6 w-full overflow-x-auto min-h-[40px] sm:min-h-[45px]">
                <TabsTrigger value="available" className="text-xs sm:text-sm px-1 sm:px-2 lg:px-3">
                  <span className="hidden xs:inline">Available</span>
                  <span className="xs:hidden">Requests</span>
                  {availableRides.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs min-w-[1.2rem] text-center">{availableRides.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="scheduled" className="text-xs sm:text-sm px-1 sm:px-2 lg:px-3">
                  <span className="hidden xs:inline">My</span>
                  <span>Rides</span>
                  {scheduledRides.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs min-w-[1.2rem] text-center">{scheduledRides.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="bids" className="text-xs sm:text-sm px-1 sm:px-2 lg:px-3">
                  <span className="hidden xs:inline">My</span>
                  <span>Bids</span>
                  {pendingBids.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs min-w-[1.2rem] text-center">{pendingBids.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="available" className="space-y-4">
                {/* Refresh button */}
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-gray-500 sm:hidden">Available Requests</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ["/api/ride-requests"] });
                      toast({
                        title: "Refreshing available requests",
                        description: "Getting the latest ride requests...",
                      });
                    }}
                    className="gap-1 ml-auto"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span className="hidden sm:inline">Refresh</span>
                  </Button>
                </div>

                {isLoadingRides ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : !driverDetails?.verified ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-yellow-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="text-gray-600 mb-2 font-medium">Account Pending Verification</p>
                      <p className="text-sm text-gray-500 mb-4 text-center">
                        Your account is still being verified. You'll be able to access available ride requests once verification is complete.
                      </p>
                    </CardContent>
                  </Card>
                ) : availableRides.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <p className="text-gray-600 mb-4">No available ride requests at this time.</p>
                    </CardContent>
                  </Card>
                ) : hasPendingApplication ? (
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center justify-center py-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-yellow-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-gray-600 mb-2 font-medium">Limited Access During Application Review</p>
                        <p className="text-sm text-gray-500 mb-6 text-center max-w-lg">
                          While your application is being reviewed, you can view available rides but cannot submit bids. 
                          This functionality will be fully enabled once your application is approved.
                        </p>
                      </div>
                      <div className="space-y-4 mt-4 opacity-70 pointer-events-none">
                        {availableRides.map(ride => (
                          <RideRequestCard 
                            key={ride.id} 
                            ride={ride} 
                            viewType="driver" 
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  availableRides.map(ride => {
                    // Find existing bids for this ride
                    const existingBids = driverBids?.filter(bid => bid.rideId === ride.id) || [];
                    return (
                      <RideRequestCard 
                        key={ride.id} 
                        ride={ride} 
                        bids={existingBids}
                        viewType="driver" 
                      />
                    );
                  })
                )}
              </TabsContent>

              <TabsContent value="scheduled" className="space-y-4">
                {isLoadingDriverRides ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : scheduledRides.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-gray-600 mb-4">You don't have any scheduled rides yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  scheduledRides.map(ride => (
                    <RideRequestCard 
                      key={ride.id} 
                      ride={ride} 
                      viewType="driver" 
                    />
                  ))
                )}
              </TabsContent>



              <TabsContent value="bids" className="space-y-4">
                {isLoadingBids ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : hasPendingApplication ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-yellow-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="text-gray-600 mb-2 font-medium">Limited Access During Application Review</p>
                      <p className="text-sm text-gray-500 mb-4 text-center max-w-lg">
                        While your application is being reviewed, you cannot place bids on rides.
                        This functionality will be enabled once your application is approved.
                      </p>
                    </CardContent>
                  </Card>
                ) : pendingBids.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-600 mb-4">You don't have any pending bids.</p>
                    </CardContent>
                  </Card>
                ) : (
                  pendingBids
                    .map(bid => {
                      // Find ride data from all available sources
                      const ride = availableRides?.find(r => r.id === bid.rideId) || 
                                  driverRides?.find(r => r.id === bid.rideId) ||
                                  rideRequests?.find(r => r.id === bid.rideId);
                      
                      console.log(`🔍 Bid ${bid.id} (rideId: ${bid.rideId}, amount: $${bid.amount}) - ride found:`, !!ride);
                      
                      if (!ride) {
                        // If we can't find the ride data, the ride may have been cancelled or deleted
                        // Show a placeholder card to inform the driver
                        console.warn(`Could not find ride data for bid ${bid.id} with rideId ${bid.rideId} - ride may have been cancelled`);
                        return { bid, ride: null };
                      }
                      return { bid, ride };
                    })
                    .filter(Boolean) // Remove null entries
                    .map(({ bid, ride }) => {
                      
                      // Handle case where ride data is missing (cancelled/deleted ride)
                      if (!ride) {
                        // Special handling for accepted bids - these should show as confirmed rides even if ride data is missing
                        if (bid.status === "accepted") {
                          return (
                            <Card key={bid.id} className="overflow-hidden border-green-200 bg-green-50">
                              <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <CardTitle className="text-lg text-green-800">Confirmed Ride</CardTitle>
                                    <CardDescription>Final Price: ${bid.amount.toFixed(2)} (Ride #{bid.rideId})</CardDescription>
                                  </div>
                                  <Badge variant="default" className="bg-green-600">
                                    Confirmed
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-gray-700 mb-3">
                                  This ride has been confirmed at ${bid.amount.toFixed(2)}. Contact support if you need ride details.
                                </p>
                                <div className="flex gap-2 mt-2">
                                  {(bid.counterParty || bid.parentBidId) && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleShowBidHistory(bid)}
                                    >
                                      <History className="h-4 w-4 mr-1" /> Bid History
                                    </Button>
                                  )}
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => window.location.href = `/driver/support`}
                                  >
                                    Contact Support
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        }
                        
                        // For other statuses, show as cancelled ride
                        return (
                          <Card key={bid.id} className="overflow-hidden border-orange-200">
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-lg text-orange-800">Ride No Longer Available</CardTitle>
                                  <CardDescription>Bid: ${bid.amount.toFixed(2)} (Ride #{bid.rideId})</CardDescription>
                                </div>
                                <Badge variant="outline" className="border-orange-200 text-orange-800">
                                  Ride Cancelled
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-gray-600 mb-3">
                                This ride appears to have been cancelled or is no longer available.
                              </p>
                              <div className="flex gap-2 mt-2">
                                {(bid.counterParty || bid.parentBidId) && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleShowBidHistory(bid)}
                                  >
                                    <History className="h-4 w-4 mr-1" /> Bid History
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      }

                    return (
                      <Card key={bid.id} className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{ride.dropoffLocation}</CardTitle>
                              <CardDescription>Bid: ${bid.amount.toFixed(2)}</CardDescription>
                            </div>
                            <Badge variant={bid.status === "pending" ? "secondary" : 
                                         bid.status === "selected" ? "default" : 
                                         bid.status === "accepted" ? "default" : "outline"}>
                              {bid.status === "selected" ? "Awaiting Your Response" : 
                               bid.status === "pending" ? "Pending" :
                               bid.status === "accepted" ? "Ride Confirmed" : 
                               bid.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-4 mb-3">
                            <div className="flex items-center text-gray-600">
                              <Clock className="h-4 w-4 mr-1.5" />
                              <span className="text-sm">{formatDate(ride.scheduledTime, 'datetime')}</span>
                            </div>
                          </div>

                          <div className="space-y-2 text-sm mb-3">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Pickup:</span>
                              <span className="text-right max-w-[200px] truncate" title={ride.pickupLocation}>
                                {ride.pickupLocation}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Dropoff:</span>
                              <span className="text-right max-w-[200px] truncate" title={ride.dropoffLocation}>
                                {ride.dropoffLocation}
                              </span>
                            </div>
                          </div>

                          {bid.notes && (
                            <div className="bg-gray-50 p-3 rounded-lg text-sm mb-3">
                              <p className="font-medium mb-1">Your Note:</p>
                              <p className="text-gray-600">{bid.notes}</p>
                            </div>
                          )}

                          <div className="flex gap-2 mt-2">
                            {bid.status === "accepted" && (
                              <div className="flex gap-2 w-full">
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="h-4 w-4 mr-1" /> Ride Confirmed
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => window.location.href = `/driver/ride/${ride.id}`}
                                >
                                  View Details
                                </Button>
                              </div>
                            )}

                            {(bid.status === "selected" || bid.status === "countered") && (
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => handleAcceptBid(bid)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="h-4 w-4 mr-1" /> Accept Price
                              </Button>
                            )}

                            {(bid.counterParty || bid.parentBidId) && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleShowBidHistory(bid)}
                              >
                                <History className="h-4 w-4 mr-1" /> Bid History
                              </Button>
                            )}

                            {(!bid.counterParty || bid.counterParty === 'rider') && bid.status === "pending" && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleShowCounterOffer(bid)}
                              >
                                <ArrowLeftRight className="h-4 w-4 mr-1" /> Counter Offer
                              </Button>
                            )}

                            {bid.status === "pending" && (
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleWithdrawBid(bid)}
                              >
                                <X className="h-4 w-4 mr-1" /> Withdraw Bid
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }).filter(Boolean)
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Most important driver tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  <Link href="/driver/account#availability">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start h-12 text-left"
                    >
                      <CalendarDays className="mr-3 h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">Set Availability</div>
                        <div className="text-xs text-muted-foreground">Manage your schedule</div>
                      </div>
                    </Button>
                  </Link>
                  <Link href="/driver/account#onboarding">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start h-12 text-left"
                    >
                      <FileText className="mr-3 h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">Documents</div>
                        <div className="text-xs text-muted-foreground">Check verification status</div>
                      </div>
                    </Button>
                  </Link>
                  <Link href="/driver/account#service-area">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start h-12 text-left"
                    >
                      <Map className="mr-3 h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">Service Area</div>
                        <div className="text-xs text-muted-foreground">Update coverage zones</div>
                      </div>
                    </Button>
                  </Link>
                  <Link href="/driver/add-vehicle">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start h-12 text-left"
                    >
                      <Car className="mr-3 h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">Vehicles</div>
                        <div className="text-xs text-muted-foreground">Manage your fleet</div>
                      </div>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Stripe Connect Payment Setup */}
            <StripeConnectOnboarding />

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Earnings Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-500">Today</p>
                      <p className="text-lg font-medium">$0.00</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-500">This Week</p>
                      <p className="text-lg font-medium">$0.00</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">This Month</p>
                    <p className="text-lg font-medium">${totalEarnings.toFixed(2)}</p>
                    <div className="h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: `${Math.min(100, (totalEarnings / 1000) * 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Goal: $1,000.00</p>
                  </div>

                  <Button variant="outline" className="w-full">
                    View Earnings Details
                  </Button>
                </div>
              </CardContent>
            </Card>

            {vehicles && vehicles.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>My Vehicles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {vehicles.map((vehicle) => (
                    <div key={vehicle.id} className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
                      <div className="flex items-center">
                        <div className="bg-gray-100 rounded-full p-2 mr-3">
                          {vehicle.vehicleType === 'wheelchair' && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                          )}
                          {vehicle.vehicleType === 'stretcher' && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                            </svg>
                          )}
                          {vehicle.vehicleType === 'standard' && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                              <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H11a1 1 0 001-1v-5h2v5a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H19a1 1 0 001-1v-5a1 1 0 00-.293-.707L17 6.586V4a1 1 0 00-1-1H3z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{vehicle.make} {vehicle.model} ({vehicle.year})</p>
                          <p className="text-xs text-gray-500 capitalize">{vehicle.vehicleType} • {vehicle.licensePlate}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Counter Offer Dialog */}
      {counterOfferBid && (
        <Dialog open={!!counterOfferBid} onOpenChange={(open) => !open && setCounterOfferBid(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Submit Counter-Offer</DialogTitle>
            </DialogHeader>
            <CounterOfferForm 
              originalBid={counterOfferBid} 
              allBids={driverBids?.filter(bid => bid.rideId === counterOfferBid.rideId) || []}
              onSuccess={handleCounterOfferSuccess}
              onCancel={() => setCounterOfferBid(null)}
              userRole="driver"
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Bid History Dialog */}
      <Dialog open={showBidHistory} onOpenChange={setShowBidHistory}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bid History</DialogTitle>
          </DialogHeader>
          {isLoadingBidHistory ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {bidHistory.map((bid) => (
                <div key={bid.id} className="border-b py-4 first:pt-0 last:border-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">
                        {bid.counterParty === 'rider' ? 'Rider' : 'Driver'} 
                        {bid.counterParty === 'driver' ? ` #${bid.driverId}` : ''}
                      </p>
                      <p className="text-sm text-gray-600">
                        Bid: ${bid.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(bid.createdAt)}
                      </p>
                    </div>
                    <Badge>
                      {bid.status === 'pending' ? 'Pending' : 
                       bid.status === 'accepted' ? 'Accepted' : 
                       bid.status === 'countered' ? 'Countered' : 
                       bid.status === 'maxReached' ? 'Max Reached' : 
                       bid.status}
                    </Badge>
                  </div>
                  {bid.notes && (
                    <p className="text-sm text-gray-600">{bid.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Legal Agreements Popup */}
      <LegalAgreementsPopup
        isOpen={showLegalPopup}
        onClose={() => setShowLegalPopup(false)}
        onComplete={() => {
          setShowLegalPopup(false);
          // Refresh queries to get updated data after legal agreements are signed
          queryClient.invalidateQueries({ queryKey: ["/api/legal-agreements/completion-status"] });
          queryClient.invalidateQueries({ queryKey: ["/api/driver/bids"] });
          queryClient.invalidateQueries({ queryKey: ["/api/driver/available-rides"] });
          
          toast({
            title: "Legal Agreements Signed",
            description: "You can now access all driver features and bid on rides.",
          });
        }}
      />
    </div>
  );
}
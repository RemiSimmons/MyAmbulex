import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Alert,
  AlertDescription, 
  AlertTitle 
} from "@/components/ui/alert";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Calendar, 
  Car, 
  Clock, 
  MapPin, 
  Navigation,
  Coins,
  Phone,
  MapIcon,
  MessageCircle,
  Ban,
  AlertTriangle,
  CheckCircle2,
  WalletCards,
  ShieldAlert,
  Check,
  X,
  ArrowLeftRight,
  Loader2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, formatDateTime, cleanAddress } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Ride, Bid } from "@shared/schema";
import { CounterOfferForm } from "@/components/counter-offer-form";

/**
 * This page displays detailed information about a ride
 * It's used for both active and past rides
 */
const RideDetailsPage: React.FC = () => {
  const { rideId } = useParams();
  const rideIdNumber = parseInt(rideId || '0');
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Fetch ride details
  const { data: ride, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/rides', rideIdNumber],
    enabled: Boolean(rideIdNumber),
    queryFn: async ({ queryKey }) => {
      try {
        const response = await fetch(`/api/rides/${rideIdNumber}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          console.error("Ride details fetch error:", response.status, errorData);
          throw new Error(errorData?.message || `Error ${response.status}: Access Denied`);
        }
        
        return response.json();
      } catch (err) {
        console.error("Error fetching ride details:", err);
        throw err;
      }
    }
  });
  
  // Fetch driver details if we have a driverId 
  const { data: driver } = useQuery({
    queryKey: ['/api/drivers', ride?.driverId],
    enabled: Boolean(ride?.driverId),
  });

  // Fetch all bids for this ride with proper controls to prevent infinite loops
  const { data: bids = [], isLoading: isLoadingBids, refetch: refetchBids } = useQuery<Bid[]>({
    queryKey: ['/api/bids/ride', rideIdNumber],
    // Only fetch bids if ride exists, user is authenticated, and is not cancelled
    enabled: Boolean(rideIdNumber) && Boolean(user) && ride?.status !== 'cancelled',
    // Don't keep refetching automatically - only manual refetch
    refetchInterval: false,
    // Don't refetch on window focus to prevent excessive requests
    refetchOnWindowFocus: false,
    // Cache for 30 seconds to prevent rapid refetching
    staleTime: 30 * 1000,
    queryFn: async () => {
      try {
        const response = await fetch(`/api/bids/ride/${rideIdNumber}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            console.log(`No bids available - ride ${rideIdNumber} may have been cancelled`);
            return [];
          } else {
            console.error(`Error fetching bids for ride ${rideIdNumber}:`, response.status);
            return [];
          }
        }
        
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error(`Failed to fetch bids for ride ${rideIdNumber}:`, error);
        return [];
      }
    },
  });
  
  // State for cancellation confirmation
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  
  // State for bid management
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);
  const [showBidsDialog, setShowBidsDialog] = useState(false);
  const [showCounterOfferForm, setShowCounterOfferForm] = useState(false);
  const [isAcceptingBid, setIsAcceptingBid] = useState(false);
  
  // Helper function to get consistent display price
  const getDisplayPrice = (ride: Ride): number => {
    // For scheduled/paid rides, use finalPrice if available
    if (['scheduled', 'paid', 'en_route', 'arrived', 'in_progress', 'completed'].includes(ride.status)) {
      if (ride.finalPrice) {
        return ride.finalPrice;
      }
    }
    
    // For bidding phase, use highest bid if available
    if (['requested', 'bidding'].includes(ride.status) && bids.length > 0) {
      const highestBid = bids.reduce((max, bid) => (bid.amount > max.amount ? bid : max), bids[0]);
      if (highestBid) {
        return highestBid.amount;
      }
    }
    
    // Fallback to ride's bidding amount or final price
    return ride.finalPrice || ride.riderBid || 0;
  };

  // Helper function to format status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge>Pending</Badge>;
      case 'bidding':
        return <Badge>Bidding</Badge>;
      case 'scheduled':
        return <Badge variant="outline">Scheduled</Badge>;
      case 'paid':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-700 dark:text-blue-100">Paid</Badge>;
      case 'en_route':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-700 dark:text-yellow-100">Driver En Route</Badge>;
      case 'arrived':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-700 dark:text-green-100">Driver Arrived</Badge>;
      case 'in_progress':
        return <Badge>In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-700 dark:text-green-100">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  // Check if ride is in a trackable state (en_route, arrived, or in_progress)
  const isTrackable = ride?.status === 'en_route' || 
                      ride?.status === 'arrived' || 
                      ride?.status === 'in_progress';
                      
  // Check if ride is cancellable (requested, pending, bidding, scheduled, paid, or en_route)
  const isCancellable = ride?.status === 'requested' ||
                        ride?.status === 'pending' || 
                        ride?.status === 'bidding' || 
                        ride?.status === 'scheduled' ||
                        ride?.status === 'paid' ||
                        ride?.status === 'en_route';
                        
  // Check if ride is in a payable state (scheduled)
  const isPayable = ride?.status === 'scheduled';
  
  // Handle back button
  const handleBack = () => {
    navigate('/rider/dashboard');
  };
  
  // Handle tracking button
  const handleTrackRide = () => {
    navigate(`/rider/ride-tracking/${rideId}`);
  };
  
  // Handle chat button
  const handleChat = () => {
    navigate(`/chat/${rideId}`);
  };
  
  // Handle payment button
  const handlePayment = () => {
    navigate(`/rider/payment/${rideId}`);
  };
  
  // Handle showing the bids dialog
  const handleShowBids = () => {
    setShowBidsDialog(true);
  };
  
  // Handle showing counter offer form
  const handleShowCounterOffer = (bid: Bid) => {
    setSelectedBid(bid);
    setShowCounterOfferForm(true);
  };
  
  // Handle accepting a bid
  const handleAcceptBid = async (bid: Bid) => {
    if (!ride || isAcceptingBid) return;
    
    setIsAcceptingBid(true);
    
    try {
      // Call the API to accept this bid
      const response = await apiRequest("POST", `/api/bids/${bid.id}/accept`, {});
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to accept bid");
      }
      
      toast({
        title: "Bid Accepted",
        description: "You've accepted the driver's bid. Please proceed to payment to confirm your ride.",
      });
      
      // Refresh ride data
      refetch();
      refetchBids();
      setShowBidsDialog(false);
      
      // After a short delay, show payment prompt
      setTimeout(() => {
        toast({
          title: "Payment Required",
          description: "Your ride is scheduled! Click 'Make Payment' to complete the booking.",
          duration: 8000,
        });
      }, 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to accept the bid",
        variant: "destructive",
      });
    } finally {
      setIsAcceptingBid(false);
    }
  };
  
  // Handle counter offer completion
  const handleCounterOfferComplete = () => {
    setShowCounterOfferForm(false);
    setSelectedBid(null);
    refetchBids();
    toast({
      title: "Counter Offer Submitted",
      description: "Your counter-offer has been sent to the driver.",
    });
  };
  
  // Handle cancel ride
  const handleCancelRide = async () => {
    if (!ride) return;
    
    setIsCancelling(true);
    
    try {
      // Use a regular fetch instead of apiRequest to ensure proper handling of the DELETE request with a body
      const response = await fetch(`/api/rides/${rideId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancellationReason: "Cancelled by rider from ride details page"
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Server error" }));
        throw new Error(errorData.message || `Error ${response.status}: Failed to cancel ride`);
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/rides'] });
      
      toast({
        title: "Ride Cancelled",
        description: `Your ride has been successfully cancelled.`,
      });
      
      // Return to dashboard after successfully cancelling the ride
      navigate('/rider/dashboard');
    } catch (err) {
      console.error("Error cancelling ride:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to cancel the ride. Please try again.",
        variant: "destructive",
      });
      
      // Just hide the confirmation dialog if there was an error
      setShowCancelConfirm(false);
      setIsCancelling(false);
    }
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
          <h1 className="text-xl font-semibold">Loading ride details...</h1>
        </div>
        
        <Skeleton className="w-full h-40 rounded-md" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="w-full h-40 rounded-md" />
          <Skeleton className="w-full h-40 rounded-md" />
        </div>
      </div>
    );
  }
  
  // Render error state
  if (error || !ride) {
    console.error("Ride details error:", error);
    
    return (
      <div className="container max-w-5xl py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-xl font-semibold">Ride Details</h1>
        </div>
        
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              Error Loading Ride
            </CardTitle>
            <CardDescription>
              We couldn't load the ride information. The ride may not exist or you may not have permission to view it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Error Details</AlertTitle>
                <AlertDescription className="font-mono text-sm break-all">
                  {error.message || "Unknown error"}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2 text-sm mb-4 p-4 bg-muted rounded-md">
              <div><strong>Ride ID:</strong> {rideId}</div>
              <div><strong>User ID:</strong> {user?.id}</div>
              <div><strong>User Role:</strong> {user?.role}</div>
              <div><strong>Error Type:</strong> {error?.name || "Unknown"}</div>
              <div><strong>Time:</strong> {new Date().toLocaleTimeString()}</div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleBack} variant="outline">Return to Dashboard</Button>
              <Button onClick={() => refetch()}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Ensure the user has permission to view this ride
  // Permission check:
  // 1. Admin users can view all rides
  // 2. Riders can view their own rides
  // 3. Drivers can view assigned rides or rides available for bidding
  const hasPermission = 
    user?.role === 'admin' || 
    (user?.role === 'rider' && user.id === ride.riderId) ||
    (user?.role === 'driver' && (ride.driverId === user.id || !ride.driverId));
  
  console.log("Permission check:", {
    userRole: user?.role,
    userId: user?.id,
    rideId: ride.id,
    riderId: ride.riderId,
    driverId: ride.driverId,
    hasPermission
  });
  
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
          <CardHeader className="border-b">
            <CardTitle className="flex items-center text-red-500">
              <ShieldAlert className="mr-2 h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You don't have permission to view this ride information.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="mb-4 p-4 bg-muted rounded-md text-sm">
              <p><strong>User ID:</strong> {user?.id}</p>
              <p><strong>Role:</strong> {user?.role}</p>
              <p><strong>Ride ID:</strong> {ride.id}</p>
              <p><strong>Ride Owner ID:</strong> {ride.riderId}</p>
              {ride.driverId && <p><strong>Assigned Driver ID:</strong> {ride.driverId}</p>}
            </div>
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
          <h1 className="text-xl font-semibold">Ride Details</h1>
        </div>
        <div>
          {getStatusBadge(ride.status)}
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
        {isTrackable && (
          <Button onClick={handleTrackRide} className="w-full">
            <MapIcon className="mr-2 h-4 w-4" />
            Track Ride
          </Button>
        )}
        
        {ride.driverId && (
          <Button variant="outline" onClick={handleChat} className="w-full">
            <MessageCircle className="mr-2 h-4 w-4" />
            Message Driver
          </Button>
        )}
        
        {isPayable && (
          <Button variant="default" onClick={handlePayment} className="w-full">
            <WalletCards className="mr-2 h-4 w-4" />
            Make Payment
          </Button>
        )}
        
        {/* Show View Bids button when ride has received bids */}
        {["requested", "bidding"].includes(ride.status) && bids.length > 0 && (
          <Button onClick={handleShowBids} className="w-full bg-blue-500 hover:bg-blue-600">
            <Coins className="mr-2 h-4 w-4" />
            View {bids.length} {bids.length === 1 ? 'Bid' : 'Bids'}
          </Button>
        )}
        
        {isCancellable && !showCancelConfirm && (
          <Button variant="destructive" onClick={() => setShowCancelConfirm(true)} className="w-full">
            <Ban className="mr-2 h-4 w-4" />
            Cancel Ride
          </Button>
        )}
      </div>
      
      {/* Cancellation confirmation */}
      {showCancelConfirm && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Confirm Cancellation</AlertTitle>
          <AlertDescription>
            <div className="space-y-4">
            <div>
              Are you sure you want to cancel this ride? This action cannot be undone.
            </div>
            
            {(ride.status === "scheduled" || ride.status === "paid" || ride.status === "en_route") && (
              <div className="text-sm bg-red-50 p-3 rounded-md border border-red-200">
                <p className="font-medium">Important:</p>
                <p>Cancelling a scheduled ride may incur a cancellation fee depending on how close it is to the pickup time.</p>
                <ul className="mt-2 list-disc list-inside">
                  <li>Cancellations made more than 24 hours before pickup: No fee</li>
                  <li>Cancellations made between 2-24 hours before pickup: 50% fee</li>
                  <li>Cancellations made less than 2 hours before pickup: 100% fee</li>
                </ul>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                variant="destructive" 
                onClick={handleCancelRide} 
                disabled={isCancelling}
              >
                {isCancelling ? "Cancelling..." : "Yes, Cancel Ride"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowCancelConfirm(false)}
                disabled={isCancelling}
              >
                No, Keep Ride
              </Button>
            </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Main ride information */}
      <Card>
        <CardHeader>
          <CardTitle>Ride Information</CardTitle>
          {ride.status === 'cancelled' && (
            <CardDescription className="text-red-500">
              This ride was cancelled.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Scheduled Time</span>
              </div>
              <p>{formatDate(ride.scheduledTime, 'long')}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Coins className="h-4 w-4" />
                <span>Fare</span>
              </div>
              <p>{formatCurrency(getDisplayPrice(ride))}</p>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>Pickup Location</span>
            </div>
            <p>{cleanAddress(ride.pickupLocation)}</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Navigation className="h-4 w-4" />
              <span>Dropoff Location</span>
            </div>
            <p>{cleanAddress(ride.dropoffLocation)}</p>
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
      
      {/* Driver information if assigned */}
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
                <p>{(driver as any)?.fullName || (driver as any)?.username || "N/A"}</p>
              </div>
              
              {(driver as any)?.phone && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>Contact</span>
                  </div>
                  <p>{(driver as any)?.phone}</p>
                </div>
              )}
            </div>
            
            {(driver as any)?.vehicle && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Car className="h-4 w-4" />
                  <span>Vehicle</span>
                </div>
                <p>{`${(driver as any)?.vehicle?.year || ""} ${(driver as any)?.vehicle?.make || ""} ${(driver as any)?.vehicle?.model || ""} - ${(driver as any)?.vehicle?.color || ""}`.trim()}</p>
                {(driver as any)?.vehicle?.licensePlate && (
                  <p className="text-sm text-muted-foreground">License: {(driver as any)?.vehicle?.licensePlate}</p>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={handleChat}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Message Driver
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {/* Bid information if in bidding state */}
      {(ride.status === 'bidding' || ride.status === 'pending') && (
        <Card>
          <CardHeader>
            <CardTitle>Bidding Status</CardTitle>
            <CardDescription>
              {bids.length === 0 ? 
                "Your ride request is waiting for driver bids." :
                `You have received ${bids.length} ${bids.length === 1 ? 'bid' : 'bids'} for this ride.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bids.length === 0 ? (
              <div className="flex items-center justify-center p-6">
                <div className="flex flex-col items-center space-y-2">
                  <Clock className="h-8 w-8 text-muted-foreground animate-pulse" />
                  <p className="text-center text-muted-foreground">Waiting for driver bids...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p>
                    <span className="font-medium">{bids.length}</span> {bids.length === 1 ? 'driver has' : 'drivers have'} placed bids
                  </p>
                  <Button onClick={handleShowBids} variant="outline" size="sm">
                    <Coins className="mr-2 h-4 w-4" />
                    View All Bids
                  </Button>
                </div>
                
                {bids.length > 0 && (
                  <Alert>
                    <Coins className="h-4 w-4" />
                    <AlertTitle>Best Offer: {formatCurrency(Math.min(...bids.map(b => b.amount)))}</AlertTitle>
                    <AlertDescription>
                      Click "View All Bids" to see details and accept or counter offers.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Bids Dialog */}
      <Dialog open={showBidsDialog} onOpenChange={setShowBidsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Available Bids</DialogTitle>
          </DialogHeader>
          
          {isLoadingBids ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : bids.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No bids have been received yet.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto py-2">
              {bids.map(bid => (
                <Card key={bid.id} className="relative">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center mb-2">
                      <CardTitle className="text-lg">
                        {formatCurrency(bid.amount)}
                      </CardTitle>
                      <Badge variant={
                        bid.status === 'accepted' ? 'default' : 
                        bid.status === 'selected' ? 'secondary' : 
                        bid.status === 'rejected' ? 'destructive' : 
                        'outline'
                      }>
                        {bid.status === 'pending' ? 'New Bid' : 
                         bid.status === 'accepted' ? 'Accepted' : 
                         bid.status === 'selected' ? 'Selected' : 
                         bid.status === 'countered' ? 'Countered' : 
                         bid.status === 'rejected' ? 'Rejected' :
                         bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                      </Badge>
                    </div>
                    <CardDescription>
                      {(bid as any).driverName || `Driver #${bid.driverId}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Bid Date:</span>{' '}
                        {formatDateTime(bid.createdAt)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Bid Status:</span>{' '}
                        {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                      </div>
                      {bid.notes && (
                        <div className="col-span-2 mt-2">
                          <span className="text-muted-foreground">Notes:</span>{' '}
                          {bid.notes}
                        </div>
                      )}
                    </div>
                  </CardContent>
                  {bid.status === 'pending' && (
                    <CardFooter className="flex justify-end space-x-2 pt-2">
                      {(bid as any).bidCount < 3 && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleShowCounterOffer(bid)}
                        >
                          <ArrowLeftRight className="mr-2 h-4 w-4" />
                          Counter
                        </Button>
                      )}
                      {(bid as any).bidCount >= 3 && (
                        <div className="text-sm text-muted-foreground">
                          Maximum 3 bids reached
                        </div>
                      )}
                      <Button 
                        size="sm"
                        onClick={() => handleAcceptBid(bid)}
                        disabled={isAcceptingBid}
                      >
                        {isAcceptingBid ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="mr-2 h-4 w-4" />
                        )}
                        Accept
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              ))}
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="secondary" 
              onClick={() => setShowBidsDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Counter Offer Dialog */}
      <Dialog open={showCounterOfferForm} onOpenChange={setShowCounterOfferForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make Counter Offer</DialogTitle>
          </DialogHeader>
          
          {selectedBid && (
            <CounterOfferForm 
              originalBid={selectedBid}
              rideId={ride?.id || 0}
              onComplete={handleCounterOfferComplete}
              role="rider"
            />
          )}
          
          <DialogFooter>
            <Button 
              variant="secondary" 
              onClick={() => setShowCounterOfferForm(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RideDetailsPage;
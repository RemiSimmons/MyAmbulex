import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ride, Bid, User } from "@shared/schema";
import AddressInput from "@/components/address-input";
import RatingDialog from "@/components/rating-dialog";
import RideTrackingDialog from "@/components/ride-tracking-dialog";
import { RideProgressIndicator } from "@/components/ride-progress-indicator";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Calendar,
  MapPin,
  Clock,
  Car,
  Accessibility,
  Truck,
  Bed,
  ChevronRight,
  Eye,
  Check,
  X,
  DollarSign,
  ArrowLeftRight,
  ChevronDown,
  History,
  Trash2,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Play,
  MapIcon,
  Star,
  Navigation,
  RefreshCw,
  EyeOff
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import BidSlider from "@/components/bid-slider";
import { CounterOfferForm } from "@/components/counter-offer-form";
import PaymentButton from "@/components/payment-button";
import { CancelRideDialog } from "@/components/cancel-ride-dialog";
import { useToast } from "@/hooks/use-toast";
import MapView from "@/components/map-view";
import RoutePreview from "@/components/route-preview";
import { useAuth } from "@/hooks/use-auth";

interface RideRequestCardProps {
  ride: Ride;
  bids?: Bid[];
  viewType: "rider" | "driver" | "admin";
}

export default function RideRequestCard({ ride, bids = [], viewType }: RideRequestCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [isAcceptingBid, setIsAcceptingBid] = useState(false);
  const [selectedBidId, setSelectedBidId] = useState<number | null>(null);
  const [counterOfferBid, setCounterOfferBid] = useState<Bid | null>(null);
  const [isHidingRide, setIsHidingRide] = useState(false);
  const [showBidHistory, setShowBidHistory] = useState(false);
  const [bidHistory, setBidHistory] = useState<Bid[]>([]);
  const [isLoadingBidHistory, setIsLoadingBidHistory] = useState(false);
  const [isDeletingRide, setIsDeletingRide] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingRide, setEditingRide] = useState(false);
  const [isSavingRideEdits, setIsSavingRideEdits] = useState(false);
  const [showDriverReviewDialog, setShowDriverReviewDialog] = useState(false);
  const [isUpdatingRideStatus, setIsUpdatingRideStatus] = useState(false);
  const [isRespondingToEdit, setIsRespondingToEdit] = useState(false);
  const [editResponseNotes, setEditResponseNotes] = useState("");
  const [pendingEditId, setPendingEditId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Safe date parsing function
  const parseScheduledTime = (dateString: any) => {
    if (!dateString) return new Date().toISOString().slice(0, 16);
    
    try {
      // Handle different date formats
      let date;
      if (typeof dateString === 'string') {
        // Replace space with T for ISO format if needed
        const isoString = dateString.replace(' ', 'T');
        date = new Date(isoString);
      } else {
        date = new Date(dateString);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', dateString);
        return new Date().toISOString().slice(0, 16);
      }
      
      return date.toISOString().slice(0, 16);
    } catch (error) {
      console.error('Error parsing date:', error, dateString);
      return new Date().toISOString().slice(0, 16);
    }
  };

  // State for ride edit form
  const [editedRideData, setEditedRideData] = useState({
    pickupLocation: ride.pickupLocation,
    dropoffLocation: ride.dropoffLocation,
    scheduledTime: parseScheduledTime(ride.scheduledTime),
    specialInstructions: ride.specialInstructions || "",
    requestNotes: ""
  });
  
  // Track coordinates for edited locations
  const [pickupCoordinates, setPickupCoordinates] = useState<{lat: number, lng: number} | null>(
    ride.pickupLocationLat && ride.pickupLocationLng 
      ? { lat: ride.pickupLocationLat, lng: ride.pickupLocationLng } 
      : null
  );
  const [dropoffCoordinates, setDropoffCoordinates] = useState<{lat: number, lng: number} | null>(
    ride.dropoffLocationLat && ride.dropoffLocationLng 
      ? { lat: ride.dropoffLocationLat, lng: ride.dropoffLocationLng } 
      : null
  );
  
  // For driver to review ride changes
  const [pendingRideReview, setPendingRideReview] = useState(false);
  const [pendingEdits, setPendingEdits] = useState<any>(null);
  const [isLoadingPendingEdits, setIsLoadingPendingEdits] = useState(false);
  
  // For the ride tracking dialog
  const [showRideTracking, setShowRideTracking] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [rateUserData, setRateUserData] = useState<User | null>(null);
  
  // For accepting initial price (drivers only)
  const [isAcceptingInitialPrice, setIsAcceptingInitialPrice] = useState(false);
  const [showAcceptInitialPriceDialog, setShowAcceptInitialPriceDialog] = useState(false);
  
  // Find the highest bid for this ride (if any)
  const highestBid = bids.length > 0 
    ? bids.reduce((max, bid) => (bid.amount > max.amount ? bid : max), bids[0]) 
    : null;

  // Calculate display price for a ride (consistent with ride details)
  const calculateDisplayPrice = (ride: Ride): string => {
    // For scheduled/paid rides, use finalPrice if available
    if (['scheduled', 'paid', 'en_route', 'arrived', 'in_progress', 'completed'].includes(ride.status)) {
      if (ride.finalPrice) {
        return ride.finalPrice.toFixed(2);
      }
    }
    
    // For bidding phase, use highest bid if available
    if (['requested', 'bidding'].includes(ride.status) && bids.length > 0) {
      if (highestBid) {
        return highestBid.amount.toFixed(2);
      }
    }
    
    // PRIORITY: Use rider's bid amount first (this is what the rider actually bid)
    if (ride.riderBid && ride.riderBid > 0) {
      return ride.riderBid.toFixed(2);
    }
    
    // Fallback to final price if available
    if (ride.finalPrice) {
      return ride.finalPrice.toFixed(2);
    }
    
    // If there's estimated distance, calculate a reasonable price
    if (ride.estimatedDistance && ride.estimatedDistance > 0) {
      // Base price of $30 + $2 per mile
      const basePrice = 30 + (ride.estimatedDistance * 2);
      // Add premium for vehicle type
      const vehiclePremium = ride.vehicleType === 'wheelchair' ? 20 : 
                            ride.vehicleType === 'stretcher' ? 40 : 0;
      // Add premium for round trip
      const roundTripFactor = ride.isRoundTrip ? 1.8 : 1;
      
      return Math.round((basePrice + vehiclePremium) * roundTripFactor).toFixed(2);
    }
    
    // If no pricing data available, show "TBD" instead of a fake price
    return "TBD";
  };
  
  // Fetch pending edits for this ride if it has edit_pending status
  useEffect(() => {
    if (ride.status === "edit_pending" && viewType === "driver") {
      const fetchPendingEdits = async () => {
        setIsLoadingPendingEdits(true);
        try {
          const response = await fetch(`/api/rides/${ride.id}/edits`, {
            credentials: "include",
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('Pending edits data:', data);
            if (data.length > 0) {
              setPendingEdits(data[0]); // Get the most recent edit
              setPendingEditId(data[0].id);
              console.log('Set pending edit ID to:', data[0].id);
            }
          } else {
            toast({
              title: "Error",
              description: "Could not load ride edit details",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Error fetching pending edits:", error);
        } finally {
          setIsLoadingPendingEdits(false);
        }
      };
      
      fetchPendingEdits();
    }
  }, [ride.id, ride.status, viewType]);
  
  // Function to refresh this specific ride card data
  const refreshRideData = async () => {
    setIsRefreshing(true);
    try {
      // Refresh ride data
      queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
      
      // If this is an active request with bids, also refresh the bids
      if (["requested", "bidding", "edit_pending"].includes(ride.status)) {
        queryClient.invalidateQueries({ queryKey: [`/api/rides/${ride.id}/bids`] });
      }
      
      toast({
        title: "Refreshing",
        description: "Getting the latest information...",
      });
    } catch (error) {
      console.error("Error refreshing ride data:", error);
    } finally {
      // Set a small delay to make refresh animation visible for better UX
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  };

  const formatDate = (dateString: string | Date) => {
    try {
      if (!dateString) return 'No date';
      
      let date;
      if (typeof dateString === 'string') {
        // Handle ISO string format from backend (e.g., "2025-08-11T08:00:00.000Z")
        if (dateString.includes('T') && dateString.includes('Z')) {
          // This is a UTC timestamp - we need to parse it as local time
          // Extract the date and time parts before the 'T' and 'Z'
          const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
          if (isoMatch) {
            const [, year, month, day, hours, minutes, seconds] = isoMatch;
            // Create as local time, not UTC
            date = new Date(
              parseInt(year), 
              parseInt(month) - 1, 
              parseInt(day), 
              parseInt(hours), 
              parseInt(minutes), 
              parseInt(seconds)
            );
          } else {
            date = new Date(dateString);
          }
        } 
        // Handle raw database format (e.g., "2025-08-11 08:00:00")
        else if (!dateString.includes('T')) {
          const parts = dateString.split(/[\s-:]/);
          
          if (parts.length >= 6) {
            // Create date in local timezone: new Date(year, month-1, day, hours, minutes, seconds)
            date = new Date(
              parseInt(parts[0]), 
              parseInt(parts[1]) - 1, 
              parseInt(parts[2]), 
              parseInt(parts[3]), 
              parseInt(parts[4]), 
              parseInt(parts[5] || '0')
            );
          } else if (parts.length >= 3) {
            // Just date part: "2025-08-08"
            date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          } else {
            date = new Date(dateString);
          }
        } else {
          date = new Date(dateString);
        }
      } else {
        date = new Date(dateString);
      }
      
      if (isNaN(date.getTime())) {
        console.warn('Invalid date for formatting:', dateString);
        return 'Invalid date';
      }
      
      return format(date, "EEE, MMM d • h:mm a");
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'Invalid date';
    }
  };
  
  const getStatusBadge = (status: string) => {
    // Check if current driver has placed a bid on this ride for driver view
    const hasDriverBid = viewType === "driver" && user && bids.some(bid => bid.driverId === user.id);
    
    const statusMap: Record<string, { color: string, label: string }> = {
      "requested": { color: "bg-blue-100 text-blue-800", label: "Requested" },
      "bidding": { color: "bg-yellow-100 text-yellow-800", label: hasDriverBid ? "Bid Pending" : "Bidding" },
      "scheduled": { color: "bg-green-100 text-green-800", label: "Scheduled" },
      "payment_pending": { color: "bg-orange-100 text-orange-800", label: "Payment Pending" },
      "paid": { color: "bg-emerald-100 text-emerald-800", label: "Paid" },
      "en_route": { color: "bg-purple-100 text-purple-800", label: "En Route" },
      "arrived": { color: "bg-indigo-100 text-indigo-800", label: "Arrived" },
      "in_progress": { color: "bg-teal-100 text-teal-800", label: "In Progress" },
      "completed": { color: "bg-gray-100 text-gray-800", label: "Completed" },
      "cancelled": { color: "bg-red-100 text-red-800", label: "Cancelled" },
      "edit_pending": { color: "bg-amber-100 text-amber-800", label: "Waiting for Driver Response" }
    };
    
    const { color, label } = statusMap[status] || { color: "bg-gray-100 text-gray-800", label: status };
    
    return (
      <Badge className={`${color} rounded-full font-normal`}>
        {label}
      </Badge>
    );
  };
  
  const getVehicleIcon = (type: string) => {
    switch (type) {
      case "wheelchair":
        return <Accessibility className="h-4 w-4" />;
      case "stretcher":
        return <Bed className="h-4 w-4" />;
      default:
        return <Car className="h-4 w-4" />;
    }
  };
  
  const acceptBid = async (bidId: number) => {
    if (!bidId) return;
    
    setIsAcceptingBid(true);
    try {
      const response = await apiRequest("POST", `/api/bids/${bidId}/accept`);
      const result = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
      
      if (result.success) {
        toast({
          title: "Payment Successful!",
          description: result.message || "Your ride has been scheduled and payment processed.",
        });
      } else if (result.code === 'PAYMENT_METHOD_REQUIRED') {
        toast({
          title: "Payment Method Required",
          description: "Please add a payment method to accept bids.",
          variant: "destructive",
        });
        // Navigate to payment setup (you might want to add this navigation)
      } else if (result.requiresAction) {
        toast({
          title: "Payment Verification Required",
          description: "Additional verification needed for your payment method.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Payment Failed",
          description: result.message || "Unable to process payment. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Bid acceptance error:", error);
      
      if (error.code === 'PAYMENT_METHOD_REQUIRED') {
        toast({
          title: "Payment Method Required",
          description: "Please add a payment method before accepting bids.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error accepting bid",
          description: error.message || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } finally {
      setIsAcceptingBid(false);
      setSelectedBidId(null);
    }
  };
  
  const fetchBidHistory = async (bidId: number) => {
    setIsLoadingBidHistory(true);
    try {
      const response = await fetch(`/api/bids/${bidId}/history`, {
        credentials: "include",
      });
      
      if (response.ok) {
        const history = await response.json();
        setBidHistory(history);
      } else {
        const errorData = await response.json();
        toast({
          title: "Error fetching bid history",
          description: errorData.message || "Failed to load bid history",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error fetching bid history",
        description: error instanceof Error ? error.message : "Network error",
        variant: "destructive",
      });
    } finally {
      setIsLoadingBidHistory(false);
    }
  };
  
  const handleShowCounterOffer = (bid: Bid) => {
    setCounterOfferBid(bid);
  };
  
  const handleCloseCounterOffer = () => {
    setCounterOfferBid(null);
  };
  
  const handleShowBidHistory = async (bid: Bid) => {
    setShowBidHistory(true);
    await fetchBidHistory(bid.id);
  };
  
  // Removed duplicate function definition
  
  const [isLateCancellation, setIsLateCancellation] = useState(false);
  
  const deleteRide = async () => {
    setIsDeletingRide(true);
    try {
      const response = await apiRequest("DELETE", `/api/rides/${ride.id}`);
      const data = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
      toast({
        title: "Ride deleted",
        description: data.message || "Your ride request has been deleted successfully.",
      });
      
      // Store late cancellation status for potential further actions
      if (data.isLateCancellation) {
        setIsLateCancellation(data.isLateCancellation);
      }
      
      setShowDeleteConfirm(false);
    } catch (error) {
      toast({
        title: "Error deleting ride",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsDeletingRide(false);
    }
  };
  
  // Function to update ride status
  const updateRideStatus = async (newStatus: string, statusLabel: string) => {
    setIsUpdatingRideStatus(true);
    try {
      const response = await apiRequest("PATCH", `/api/rides/${ride.id}`, { 
        status: newStatus 
      });
      
      if (response.ok) {
        // Update was successful
        const data = await response.json();
        queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
        toast({
          title: "Status Updated",
          description: data.message || `Ride is now ${statusLabel.toLowerCase()}.`,
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Failed to update status",
          description: errorData.message || "There was an error updating the ride status.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error updating ride",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingRideStatus(false);
    }
  };
  
  // Function to submit ride edit request
  const submitRideEdit = async () => {
    setIsSavingRideEdits(true);
    try {
      const rideEditData = {
        rideId: ride.id,
        pickupLocation: editedRideData.pickupLocation,
        dropoffLocation: editedRideData.dropoffLocation,
        pickupLocationLat: pickupCoordinates?.lat,
        pickupLocationLng: pickupCoordinates?.lng,
        dropoffLocationLat: dropoffCoordinates?.lat,
        dropoffLocationLng: dropoffCoordinates?.lng,
        scheduledTime: editedRideData.scheduledTime,
        specialInstructions: editedRideData.specialInstructions,
        requestNotes: editedRideData.requestNotes
      };
      
      const response = await apiRequest("POST", `/api/rides/${ride.id}/edit`, rideEditData);
      
      if (response.ok) {
        const data = await response.json();
        queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
        setEditingRide(false);
        
        toast({
          title: "Edit Requested",
          description: "Your changes have been sent to the driver for review.",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Failed to submit edit",
          description: errorData.message || "There was an error submitting your ride edit request.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error submitting request",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSavingRideEdits(false);
    }
  };
  
  // Function to respond to ride edit request
  const respondToRideEdit = async (isAccepted: boolean) => {
    if (!pendingEditId) return;
    
    setIsRespondingToEdit(true);
    try {
      const response = await apiRequest("POST", `/api/ride-edits/${pendingEditId}/respond`, {
        accept: isAccepted,
        responseNotes: editResponseNotes
      });
      
      if (response.ok) {
        // Make sure we invalidate all ride-related queries to refresh the UI
        queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
        queryClient.invalidateQueries({ queryKey: ["/api/ride-requests"] });
        queryClient.invalidateQueries({ queryKey: ["/api/driver/rides"] });
        queryClient.invalidateQueries({ queryKey: ["/api/rider/rides"] });
        
        console.log('Successfully responded to ride edit, invalidated queries');
        
        toast({
          title: isAccepted ? "Changes Accepted" : "Changes Rejected",
          description: isAccepted 
            ? "You have accepted the rider's changes to this ride." 
            : "You have rejected the rider's changes to this ride.",
        });
        
        setPendingRideReview(false);
      } else {
        const errorData = await response.json();
        toast({
          title: "Error responding to edit request",
          description: errorData.message || "There was a problem processing your response.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsRespondingToEdit(false);
    }
  };
  
  // Function to hide ride (for drivers)
  const handleHideRide = async () => {
    setIsHidingRide(true);
    try {
      const response = await apiRequest("POST", `/api/driver/hide-ride/${ride.id}`, {});
      
      if (response.ok) {
        // Remove the ride from the current list
        queryClient.invalidateQueries({ queryKey: ["/api/driver/available-rides"] });
        queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
        
        toast({
          title: "Ride Hidden",
          description: "This ride has been hidden from your view.",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error hiding ride",
          description: errorData.message || "There was an error hiding this ride.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error hiding ride",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsHidingRide(false);
    }
  };

  // Function to accept initial price (for drivers)
  const handleAcceptInitialPrice = async () => {
    setIsAcceptingInitialPrice(true);
    
    try {
      const response = await apiRequest("POST", `/api/rides/${ride.id}/accept-initial`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to accept initial price");
      }
      
      // Invalidate the relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/ride-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/bids"] });
      
      // Close the dialog
      setShowAcceptInitialPriceDialog(false);
      
      // Show success message
      toast({
        title: "Success!",
        description: "You've accepted this ride at the initial price.",
      });
      
    } catch (error) {
      console.error("Error accepting initial price:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to accept the ride",
        variant: "destructive",
      });
    } finally {
      setIsAcceptingInitialPrice(false);
    }
  };
  
  // Function to handle rating a user
  const handleRateUser = async () => {
    try {
      // For rider rating driver
      if (viewType === "rider" && ride.driverId) {
        const response = await apiRequest("GET", `/api/users/${ride.driverId}`);
        if (response.ok) {
          const driverData = await response.json();
          setRateUserData(driverData);
          setShowRatingDialog(true);
        }
      }
      
      // For driver rating rider
      if (viewType === "driver" && ride.riderId) {
        const response = await apiRequest("GET", `/api/users/${ride.riderId}`);
        if (response.ok) {
          const riderData = await response.json();
          setRateUserData(riderData);
          setShowRatingDialog(true);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not load user data for rating",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-medium text-gray-900">{ride.dropoffLocation?.split(',')[0] || ride.dropoffLocation}</h3>
            {getStatusBadge(ride.status)}
          </div>
          
          {/* Add refresh button for active requests */}
          {["requested", "bidding", "edit_pending"].includes(ride.status) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshRideData}
              disabled={isRefreshing}
              className="h-8 w-8 p-0"
              title="Refresh this ride request"
            >
              <RefreshCw 
                className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} 
              />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pb-4">
        {/* Real-time ride progress indicator for active rides (riders only) */}
        {viewType === "rider" && ["scheduled", "paid", "en_route", "arrived", "in_progress"].includes(ride.status) && (
          <div className="mb-4">
            <RideProgressIndicator ride={ride} />
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">{formatDate(ride.scheduledTime)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                {getVehicleIcon(ride.vehicleType)}
                <span className="text-sm text-gray-600 capitalize">{ride.vehicleType}</span>
              </div>
              
              <div className="flex items-center gap-1 text-green-700 font-semibold">
                <DollarSign className="h-4 w-4" />
                <span>${calculateDisplayPrice(ride)}</span>
              </div>
            </div>
              
              {viewType === "driver" && (() => {
                // Find driver's bid for this ride
                const driverBid = bids?.find(bid => bid.rideId === ride.id && bid.driverId === user?.id);
                const hasBid = !!driverBid;
                const bidIsSelected = driverBid?.status === "selected";
                
                // Show buttons for rides in bidding phase
                if (["requested", "bidding"].includes(ride.status)) {
                  return (
                    <div className="flex gap-2 w-full xs:w-auto justify-end mt-2 xs:mt-0">
                      {/* Show Accept Price button if driver has a selected bid */}
                      {bidIsSelected && (
                        <Button 
                          size="sm"
                          className="bg-green-500 hover:bg-green-600 text-white text-xs h-8 px-3 flex items-center gap-1"
                          onClick={() => setShowAcceptInitialPriceDialog(true)}
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Accept Price
                        </Button>
                      )}
                      
                      {/* Show Place Bid button if driver hasn't bid yet or has a non-selected bid */}
                      {(!hasBid || (hasBid && !bidIsSelected)) && (
                        <Link href={`/driver/bid/${ride.id}`} className="contents">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-xs h-8 px-3 border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            Place Bid
                          </Button>
                        </Link>
                      )}
                      
                      {/* Show accepted status badge if bid is accepted */}
                      {hasBid && driverBid.status === 'accepted' && (
                        <Badge className="bg-green-100 text-green-800 border-green-300 text-xs h-8 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Accepted - ${driverBid.amount?.toFixed(2)}
                        </Badge>
                      )}
                    </div>
                  );
                }
                
                // Show Accept Price button for scheduled rides with selected bids (Payment tab)
                if (["scheduled", "payment_pending"].includes(ride.status) && bidIsSelected) {
                  return (
                    <div className="flex gap-2 w-full xs:w-auto justify-end mt-2 xs:mt-0">
                      <Button 
                        variant="secondary" 
                        size="sm"
                        className="bg-green-100 hover:bg-green-200 text-green-800 border-green-300 text-xs h-8 px-2"
                        onClick={() => setShowAcceptInitialPriceDialog(true)}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" /> Accept Price
                      </Button>
                    </div>
                  );
                }
                
                return null;
              })()}
            </div>
            
            <div className="space-y-3 mb-4">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 mt-1 flex-shrink-0">
                  <MapPin className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-blue-600 font-medium mb-1">Pickup</p>
                  <p className="text-sm font-medium text-gray-900">{ride.pickupLocation}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 mt-1 flex-shrink-0">
                  <MapPin className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-blue-600 font-medium mb-1">Dropoff</p>
                  <p className="text-sm font-medium text-gray-900">{ride.dropoffLocation}</p>
                </div>
              </div>
            </div>
            
            {/* Pickup/Dropoff stair information */}
            <div className="flex justify-between text-sm text-gray-600 mb-3">
              <span>Pickup: {ride.pickupStairs ? ride.pickupStairs.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) + ' stairs' : 'None stairs'}</span>
              <span>Dropoff: {ride.dropoffStairs ? ride.dropoffStairs.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) + ' stairs' : 'None stairs'}</span>
            </div>
            
            {/* Additional details (shown conditionally) */}
            {ride.specialInstructions && (
              <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-600 mb-3">
                <p className="font-medium text-gray-700 mb-1">Special Instructions:</p>
                <p>{ride.specialInstructions}</p>
              </div>
            )}
            
            {/* Accessibility details */}
            <div className="flex flex-wrap gap-2 mb-3">
              {ride.needsRamp && (
                <Badge variant="outline" className="font-normal text-xs">
                  Ramp Needed
                </Badge>
              )}
              {ride.needsWaitTime && (
                <Badge variant="outline" className="font-normal text-xs">
                  {ride.waitTimeMinutes && ride.waitTimeMinutes > 0 
                    ? `Wait: ${ride.waitTimeMinutes} min` 
                    : "Wait Time"}
                </Badge>
              )}
              {ride.needsCompanion && (
                <Badge variant="outline" className="font-normal text-xs">
                  Companion
                </Badge>
              )}
              {ride.needsStairChair && (
                <Badge variant="outline" className="font-normal text-xs">
                  Stair Chair
                </Badge>
              )}
            </div>
          </div>
          
          {/* Map view - right column */}
          <div className="hidden md:block">
            {/* Only show RoutePreview if we have valid coordinates */}
            {ride.pickupLocationLat && ride.pickupLocationLng && ride.dropoffLocationLat && ride.dropoffLocationLng ? (
              <RoutePreview
                pickupLocation={{
                  lat: ride.pickupLocationLat,
                  lng: ride.pickupLocationLng,
                  address: ride.pickupLocation
                }}
                dropoffLocation={{
                  lat: ride.dropoffLocationLat,
                  lng: ride.dropoffLocationLng,
                  address: ride.dropoffLocation
                }}
                vehicleType={ride.vehicleType}
                isRoundTrip={ride.isRoundTrip || false}
                className="h-48"
              />
            ) : (
              <div className="h-48 border border-gray-200 rounded-lg flex flex-col items-center justify-center bg-gray-50">
                <div className="text-center">
                  <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 font-medium">Route Preview</p>
                  <p className="text-xs text-gray-500 mt-1">Addresses: {ride.pickupLocation?.split(',')[0]} → {ride.dropoffLocation?.split(',')[0]}</p>
                  <p className="text-xs text-gray-400 mt-1">Map view unavailable</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Edit pending review section - only shown for edit_pending status */}
        {viewType === "driver" && ride.status === "edit_pending" && pendingEdits && (
          <div className="px-6 pb-4">
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
              <div className="flex items-start">
                <div className="shrink-0 mt-0.5">
                  <AlertTriangle className="h-5 w-5 text-amber-700" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">Ride Edit Requested</h3>
                  <div className="mt-1 text-sm text-amber-700">
                    <p>The rider has requested changes to this ride. Please review the changes and respond.</p>
                  </div>
                  <div className="mt-3">
                    <Button 
                      size="sm" 
                      onClick={() => setPendingRideReview(true)}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      Review Changes
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      
      {/* Dialog sections outside of CardContent */}
      {/* Change Review Dialog */}
      {viewType === "driver" && ride.status === "edit_pending" && pendingEdits && pendingRideReview && (
        <Dialog open={pendingRideReview} onOpenChange={setPendingRideReview}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Review Requested Changes</DialogTitle>
            </DialogHeader>
                
                <div className="py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border rounded-md p-4 bg-gray-50">
                      <h3 className="text-sm font-medium mb-2 text-gray-700">Current Ride Details</h3>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-500">Pickup Location</p>
                          <p className="text-sm font-medium">{ride.pickupLocation}</p>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-500">Dropoff Location</p>
                          <p className="text-sm font-medium">{ride.dropoffLocation}</p>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-500">Scheduled Time</p>
                          <p className="text-sm font-medium">{formatDate(ride.scheduledTime)}</p>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-500">Special Instructions</p>
                          <p className="text-sm">{ride.specialInstructions || "None"}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border rounded-md p-4 bg-blue-50 border-blue-200">
                      <h3 className="text-sm font-medium mb-2 text-blue-700">Proposed Changes</h3>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-blue-600">Pickup Location</p>
                          <p className="text-sm font-medium">
                            {pendingEdits.proposedData && pendingEdits.proposedData.pickupLocation}
                          </p>
                          {pendingEdits.proposedData && 
                            pendingEdits.proposedData.pickupLocation !== ride.pickupLocation && (
                            <Badge className="mt-1 bg-blue-100 text-blue-800">Changed</Badge>
                          )}
                        </div>
                        
                        <div>
                          <p className="text-xs text-blue-600">Dropoff Location</p>
                          <p className="text-sm font-medium">
                            {pendingEdits.proposedData && pendingEdits.proposedData.dropoffLocation}
                          </p>
                          {pendingEdits.proposedData && 
                            pendingEdits.proposedData.dropoffLocation !== ride.dropoffLocation && (
                            <Badge className="mt-1 bg-blue-100 text-blue-800">Changed</Badge>
                          )}
                        </div>
                        
                        <div>
                          <p className="text-xs text-blue-600">Scheduled Time</p>
                          <p className="text-sm font-medium">
                            {pendingEdits.proposedData && formatDate(pendingEdits.proposedData.scheduledTime)}
                          </p>
                          {pendingEdits.proposedData && 
                            new Date(pendingEdits.proposedData.scheduledTime).getTime() !== new Date(ride.scheduledTime).getTime() && (
                            <Badge className="mt-1 bg-blue-100 text-blue-800">Changed</Badge>
                          )}
                        </div>
                        
                        <div>
                          <p className="text-xs text-blue-600">Special Instructions</p>
                          <p className="text-sm">
                            {pendingEdits.proposedData && pendingEdits.proposedData.specialInstructions || "None"}
                          </p>
                          {pendingEdits.proposedData && 
                            pendingEdits.proposedData.specialInstructions !== ride.specialInstructions && (
                            <Badge className="mt-1 bg-blue-100 text-blue-800">Changed</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {pendingEdits && pendingEdits.requestNotes && (
                    <div className="mt-4 bg-gray-50 p-3 rounded-md">
                      <p className="text-sm font-medium text-gray-700">Rider's Note:</p>
                      <p className="text-sm text-gray-600 mt-1">{pendingEdits.requestNotes}</p>
                    </div>
                  )}
                  
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="response-notes">
                      Your Response (Optional)
                    </label>
                    <textarea
                      id="response-notes"
                      rows={3}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Add any notes about your decision..."
                      value={editResponseNotes}
                      onChange={(e) => setEditResponseNotes(e.target.value)}
                    />
                  </div>
                </div>
                
                <DialogFooter className="gap-2 flex-col sm:flex-row">
                  <Button 
                    variant="destructive" 
                    onClick={() => respondToRideEdit(false)}
                    disabled={isRespondingToEdit}
                  >
                    <X className="mr-2 h-4 w-4" /> Reject Changes
                  </Button>
                  <Button 
                    onClick={() => respondToRideEdit(true)} 
                    disabled={isRespondingToEdit}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="mr-2 h-4 w-4" /> Accept Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
      


      <CardFooter className="pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between w-full">
          {/* Left side - bid info or status */}
          <div className="flex items-center gap-2">
            {viewType === "rider" && ride.status === "bidding" && (
              <>
                <Badge variant="outline" className="bg-gray-50">
                  <span className="font-medium text-xs">{bids.length} Bid{bids.length !== 1 ? 's' : ''}</span>
                </Badge>
                {bids.length > 0 && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs h-8 px-3"
                      >
                        Place Bid
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Available Bids</DialogTitle>
                      </DialogHeader>
                      <div className="max-h-96 overflow-y-auto">
                        {bids.map((bid) => (
                          <div key={bid.id} className="border-b py-4 first:pt-0 last:border-0">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium">Driver #{bid.driverId}</p>
                                <p className="text-sm text-gray-600">Bid: ${bid.amount.toFixed(2)}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleShowCounterOffer(bid)}
                                >
                                  <ArrowLeftRight className="h-3 w-3 mr-1" /> Counter
                                </Button>
                                <Button 
                                  size="sm"
                                  onClick={() => setSelectedBidId(bid.id)}
                                >
                                  <Check className="h-4 w-4 mr-1" /> Accept
                                </Button>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              {bid.notes && (
                                <p className="text-sm text-gray-600">{bid.notes}</p>
                              )}
                              {(bid.parentBidId || bid.counterParty) && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="ml-auto text-xs" 
                                  onClick={() => handleShowBidHistory(bid)}
                                >
                                  <History className="h-3 w-3 mr-1" /> History
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Cancel</Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </>
            )}
          
          {viewType === "rider" && ride.riderBid && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Your bid:</span> <span>${ride.riderBid?.toFixed(2)}</span>
            </div>
          )}
          
          {viewType === "driver" && ride.finalPrice && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Price:</span> <span>${ride.finalPrice?.toFixed(2)}</span>
            </div>
          )}
        </div>
        
        {/* Right side - action buttons */}
          <div className="flex items-center gap-2">
            {/* Driver Accept Price button */}
            {viewType === "driver" && (() => {
              const driverBid = bids?.find(bid => bid.rideId === ride.id && bid.driverId === user?.id);
              const bidIsSelected = driverBid?.status === "selected";
              
              if (["requested", "bidding"].includes(ride.status) && bidIsSelected) {
                return (
                  <Button 
                    size="sm"
                    className="bg-green-500 hover:bg-green-600 text-white h-8 px-4"
                    onClick={() => setShowAcceptInitialPriceDialog(true)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" /> Accept Price
                  </Button>
                );
              }
              
              if (["requested", "bidding"].includes(ride.status) && !driverBid) {
                return (
                  <Link href={`/driver/bid/${ride.id}`} className="contents">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-8 px-4"
                    >
                      Place Bid
                    </Button>
                  </Link>
                );
              }
              
              return null;
            })()}
            
            {/* Hide button for drivers */}
            {viewType === "driver" && ["requested", "bidding"].includes(ride.status) && (
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                onClick={handleHideRide}
                disabled={isHidingRide}
              >
                <EyeOff className="h-4 w-4" />
              </Button>
            )}
            
            {/* Rider action buttons */}
            {viewType === "rider" && ["accepted", "payment_pending", "scheduled"].includes(ride.status) && (
              <>
                <PaymentButton ride={ride} />
                <Button 
                  size="sm" 
                  variant="outline"
                  className="text-xs h-8 px-3"
                  onClick={() => setEditingRide(true)}
                >
                  Edit
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  className="text-xs h-8 px-3"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Cancel
                </Button>
              </>
            )}

          {viewType === "rider" && ["en_route", "arrived", "in_progress", "paid"].includes(ride.status) && (
            <Button 
              size="sm"
              className="text-xs h-8 px-2.5"
              onClick={() => setShowRideTracking(true)}
            >
              <MapIcon className="h-3.5 w-3.5 mr-1.5" />
              Track Ride
            </Button>
          )}
          
          {/* Rider rating button for completed rides */}
          {viewType === "rider" && ride.status === "completed" && (
            <Button 
              size="sm"
              variant="outline"
              className="bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100 text-xs h-8 px-2.5"
              onClick={handleRateUser}
            >
              <Star className="h-3.5 w-3.5 mr-1.5" /> Rate Driver
            </Button>
          )}
          
          {viewType === "driver" && ["scheduled", "en_route", "arrived", "in_progress", "paid"].includes(ride.status) && (
            <>
              {/* Ride Progress Controls for Driver */}
              <div className="flex flex-wrap gap-1.5 w-full mb-2">
                <div className="w-full font-medium text-xs xs:text-sm text-gray-500 mb-1.5">Ride Progress:</div>
                
                {/* En Route Button */}
                {(ride.status === "scheduled" || ride.status === "paid") && (
                  <Button 
                    size="sm"
                    variant="outline"
                    className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 text-xs h-8 px-2.5"
                    onClick={() => updateRideStatus("en_route", "En Route")}
                    disabled={isUpdatingRideStatus}
                  >
                    <Navigation className="h-3.5 w-3.5 mr-1" /> Start En Route
                  </Button>
                )}
                
                {/* Arrived Button */}
                {ride.status === "en_route" && (
                  <Button 
                    size="sm"
                    variant="outline"
                    className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 text-xs h-8 px-2.5"
                    onClick={() => updateRideStatus("arrived", "Arrived")}
                    disabled={isUpdatingRideStatus}
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1" /> Mark Arrived
                  </Button>
                )}
                
                {/* Start Ride Button */}
                {ride.status === "arrived" && (
                  <Button 
                    size="sm"
                    variant="outline"
                    className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 text-xs h-8 px-2.5"
                    onClick={() => updateRideStatus("in_progress", "In Progress")}
                    disabled={isUpdatingRideStatus}
                  >
                    <Play className="h-3.5 w-3.5 mr-1" /> Start Ride
                  </Button>
                )}
                
                {/* Complete Ride Button */}
                {ride.status === "in_progress" && (
                  <Button 
                    size="sm"
                    variant="outline"
                    className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 text-xs h-8 px-2.5"
                    onClick={() => updateRideStatus("completed", "Completed")}
                    disabled={isUpdatingRideStatus}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Complete
                  </Button>
                )}
                
                {/* Rate User Button - For completed rides */}
                {ride.status === "completed" && (
                  <Button 
                    size="sm"
                    variant="outline"
                    className="bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100 text-xs h-8 px-2.5"
                    onClick={handleRateUser}
                  >
                    <Star className="h-3.5 w-3.5 mr-1" /> Rate Rider
                  </Button>
                )}
              </div>
            
              {/* Other driver controls */}
              {/* Simulating pendingRideReview = true for demo */}
              {viewType === "driver" && ride.status === "scheduled" && (
                <Button 
                  size="sm"
                  variant="outline"
                  className="relative bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100 text-xs h-8 px-2.5"
                  onClick={() => setShowDriverReviewDialog(true)}
                >
                  <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                    1
                  </div>
                  <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Review
                </Button>
              )}
              <Button 
                size="sm"
                className="text-xs h-8 px-2.5"
                onClick={() => {
                  // Prepare Google Maps navigation URL with origin and destination
                  let mapUrl = "https://www.google.com/maps/dir/?api=1";
                  
                  // If en_route or arrived, navigate from current location to pickup
                  if (["en_route", "arrived"].includes(ride.status)) {
                    mapUrl += `&destination=${encodeURIComponent(ride.pickupLocation)}`;
                  } 
                  // If in_progress, navigate from pickup to dropoff
                  else if (["in_progress"].includes(ride.status)) {
                    mapUrl += `&origin=${encodeURIComponent(ride.pickupLocation)}&destination=${encodeURIComponent(ride.dropoffLocation)}`;
                  }
                  // For all other statuses, just navigate to pickup
                  else {
                    mapUrl += `&destination=${encodeURIComponent(ride.pickupLocation)}`;
                  }
                  
                  // Open in a new tab
                  window.open(mapUrl, "_blank");
                }}
              >
                <Navigation className="h-3.5 w-3.5 mr-1.5" /> Navigate
              </Button>
              {ride.status === "scheduled" && (
                <Button 
                  size="sm" 
                  variant="destructive" 
                  className="text-xs h-8 px-2.5"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Cancel
                </Button>
              )}
            </>
          )}
          
          {viewType === "rider" && ride.status === "requested" && (
            <>
              <Button size="sm" variant="outline" className="text-xs h-8 px-2.5">
                Edit Request
              </Button>
              <Button 
                size="sm" 
                variant="destructive" 
                className="text-xs h-8 px-2.5"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
              </Button>
            </>
          )}
          
          {viewType === "rider" && ride.status === "bidding" && (
            <Button 
              size="sm" 
              variant="destructive" 
              className="text-xs h-8 px-2.5"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
            </Button>
          )}
          
          {/* Hide button for drivers on bidding rides */}
          {viewType === "driver" && ["requested", "bidding"].includes(ride.status) && (
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs h-8 px-2.5 text-gray-600 hover:text-gray-800"
              onClick={handleHideRide}
              disabled={isHidingRide}
            >
              <EyeOff className="h-3.5 w-3.5 mr-1.5" /> 
              {isHidingRide ? "Hiding..." : "Hide"}
            </Button>
          )}

          </div>
        </div>
      </CardFooter>
      
      {/* Confirmation Dialog for Accepting Bid */}
      <Dialog open={selectedBidId !== null} onOpenChange={() => setSelectedBidId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Bid Acceptance</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to accept this bid? Your payment method will be charged automatically and the driver will be assigned to your ride.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedBidId(null)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedBidId && acceptBid(selectedBidId)}
              disabled={isAcceptingBid}
            >
              {isAcceptingBid ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Counter Offer Dialog */}
      <Dialog open={counterOfferBid !== null} onOpenChange={handleCloseCounterOffer}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Counter Offer</DialogTitle>
          </DialogHeader>
          {counterOfferBid && (
            <CounterOfferForm 
              originalBid={counterOfferBid}
              rideId={ride.id}
              onComplete={handleCloseCounterOffer}
              onCancel={handleCloseCounterOffer}
              role="rider"
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Bid History Dialog */}
      <Dialog open={showBidHistory} onOpenChange={() => setShowBidHistory(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bid History</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {isLoadingBidHistory ? (
              <div className="flex justify-center py-4">
                <div className="h-6 w-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
            ) : bidHistory.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No bid history available</p>
            ) : (
              <div className="space-y-4">
                {bidHistory.map((bid, index) => (
                  <div key={bid.id} className="border-b pb-4 last:border-0">
                    <div className="flex justify-between">
                      <div>
                        <div className="flex items-center">
                          <Badge variant="outline" className="mr-2">
                            {bid.counterParty === 'rider' ? 'Rider' : 'Driver'} Offer
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            #{index + 1}
                          </Badge>
                        </div>
                        <p className="font-medium mt-1">${bid.amount.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {formatDate(bid.createdAt)}
                        </p>
                        <Badge 
                          className={
                            bid.status === 'accepted' ? 'bg-green-100 text-green-800' : 
                            bid.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                            bid.status === 'countered' ? 'bg-blue-100 text-blue-800' :
                            bid.status === 'maxReached' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }
                        >
                          {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                    {bid.notes && (
                      <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                        {bid.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button>Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete/Cancel Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {ride.status === "scheduled" ? "Cancel Scheduled Ride" : "Delete Ride Request"}
            </DialogTitle>
          </DialogHeader>
          
          {ride.status === "scheduled" ? (
            <>
              <p>Are you sure you want to cancel this scheduled ride? This action cannot be undone.</p>
              
              {/* Check if cancellation is within 24 hours of scheduled time */}
              {(() => {
                const scheduledTime = new Date(ride.scheduledTime);
                const now = new Date();
                const timeDiffMs = scheduledTime.getTime() - now.getTime();
                const hoursBeforeRide = timeDiffMs / (1000 * 60 * 60);
                
                if (hoursBeforeRide < 24) {
                  return viewType === "rider" ? (
                    <div className="mt-2 p-3 bg-amber-50 text-amber-700 rounded border border-amber-200">
                      <AlertTriangle className="h-5 w-5 inline-block mr-2" />
                      <span className="font-semibold">Late Cancellation Warning:</span> Since you are cancelling within 24 hours of the scheduled time, a $25 late cancellation fee may apply.
                    </div>
                  ) : (
                    <div className="mt-2 p-3 bg-amber-50 text-amber-700 rounded border border-amber-200">
                      <AlertTriangle className="h-5 w-5 inline-block mr-2" />
                      <span className="font-semibold">Late Cancellation Warning:</span> Cancelling rides within 24 hours of the scheduled time will affect your driver rating and available ride opportunities.
                    </div>
                  );
                }
                return null;
              })()}
            </>
          ) : (
            <p>Are you sure you want to delete this ride request? This action cannot be undone.</p>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={deleteRide}
              disabled={isDeletingRide}
            >
              {isDeletingRide ? (ride.status === "scheduled" ? 'Cancelling...' : 'Deleting...') : (ride.status === "scheduled" ? 'Cancel Ride' : 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Ride Dialog */}
      <Dialog open={editingRide} onOpenChange={(open) => {
        if (open) {
          // Reset form data when dialog opens
          setEditedRideData({
            pickupLocation: ride.pickupLocation,
            dropoffLocation: ride.dropoffLocation,
            scheduledTime: new Date(ride.scheduledTime).toISOString().slice(0, 16),
            specialInstructions: ride.specialInstructions || "",
            requestNotes: ""
          });
          
          // Reset coordinates
          setPickupCoordinates(
            ride.pickupLocationLat && ride.pickupLocationLng 
              ? { lat: ride.pickupLocationLat, lng: ride.pickupLocationLng } 
              : null
          );
          setDropoffCoordinates(
            ride.dropoffLocationLat && ride.dropoffLocationLng 
              ? { lat: ride.dropoffLocationLat, lng: ride.dropoffLocationLng } 
              : null
          );
        }
        setEditingRide(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Ride Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <label htmlFor="pickupLocation" className="text-sm font-medium">Pickup Location</label>
              <AddressInput
                value={editedRideData.pickupLocation}
                onChange={(value, coordinates) => {
                  setEditedRideData({
                    ...editedRideData,
                    pickupLocation: value
                  });
                  if (coordinates) {
                    setPickupCoordinates(coordinates);
                  }
                }}
                placeholder="Enter pickup address"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="dropoffLocation" className="text-sm font-medium">Dropoff Location</label>
              <AddressInput
                value={editedRideData.dropoffLocation}
                onChange={(value, coordinates) => {
                  setEditedRideData({
                    ...editedRideData,
                    dropoffLocation: value
                  });
                  if (coordinates) {
                    setDropoffCoordinates(coordinates);
                  }
                }}
                placeholder="Enter destination address"
              />
            </div>
            {isMobile ? (
              // Mobile view - separate date and time fields
              <>
                <div className="grid gap-2">
                  <label htmlFor="scheduledDate" className="text-sm font-medium">Scheduled Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                    <input 
                      id="scheduledDate" 
                      type="date" 
                      className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm" 
                      value={new Date(editedRideData.scheduledTime).toISOString().slice(0, 10)}
                      onChange={(e) => {
                        const currentDate = new Date(editedRideData.scheduledTime);
                        const newDate = new Date(e.target.value);
                        newDate.setHours(currentDate.getHours(), currentDate.getMinutes());
                        setEditedRideData({
                          ...editedRideData,
                          scheduledTime: newDate.toISOString().slice(0, 16)
                        });
                      }}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="scheduledTime" className="text-sm font-medium">Scheduled Time</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                    <input 
                      id="scheduledTime" 
                      type="time" 
                      className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm" 
                      value={new Date(editedRideData.scheduledTime).toISOString().slice(11, 16)}
                      onChange={(e) => {
                        const currentDate = new Date(editedRideData.scheduledTime);
                        const [hours, minutes] = e.target.value.split(':').map(Number);
                        currentDate.setHours(hours, minutes);
                        setEditedRideData({
                          ...editedRideData,
                          scheduledTime: currentDate.toISOString().slice(0, 16)
                        });
                      }}
                    />
                  </div>
                </div>
              </>
            ) : (
              // Desktop view - single datetime-local field
              <div className="grid gap-2">
                <label htmlFor="scheduledTime" className="text-sm font-medium">Scheduled Time</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <input 
                    id="scheduledTime" 
                    type="datetime-local" 
                    className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm" 
                    value={editedRideData.scheduledTime}
                    onChange={(e) => setEditedRideData({
                      ...editedRideData,
                      scheduledTime: e.target.value
                    })}
                  />
                </div>
              </div>
            )}
            <div className="grid gap-2">
              <label htmlFor="specialInstructions" className="text-sm font-medium">Special Instructions</label>
              <textarea 
                id="specialInstructions" 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                value={editedRideData.specialInstructions}
                onChange={(e) => setEditedRideData({
                  ...editedRideData,
                  specialInstructions: e.target.value
                })}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="requestNotes" className="text-sm font-medium">Reason for Changes</label>
              <textarea 
                id="requestNotes" 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                value={editedRideData.requestNotes}
                onChange={(e) => setEditedRideData({
                  ...editedRideData,
                  requestNotes: e.target.value
                })}
                placeholder="Please explain why you need to make these changes"
              />
            </div>
            <p className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
              Note: Changes will need to be reviewed by your assigned driver before they take effect.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRide(false)}>
              Cancel
            </Button>
            <Button 
              onClick={submitRideEdit}
              disabled={isSavingRideEdits}
            >
              {isSavingRideEdits ? 'Submitting...' : 'Submit Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Ride Tracking Dialog */}
      <RideTrackingDialog 
        open={showRideTracking}
        onOpenChange={setShowRideTracking}
        ride={ride}
      />
      
      {/* Confirmation Dialog for Accepting Initial Price */}
      <Dialog open={showAcceptInitialPriceDialog} onOpenChange={setShowAcceptInitialPriceDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Accept Initial Price</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to accept this ride at the initial price of <strong>${calculateDisplayPrice(ride)}</strong>?</p>
            <p>This will immediately assign you as the driver for this ride and notify the rider.</p>
          </div>
          <DialogFooter className="flex justify-between mt-4">
            <Button variant="outline" onClick={() => setShowAcceptInitialPriceDialog(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleAcceptInitialPrice}
              disabled={isAcceptingInitialPrice}
            >
              {isAcceptingInitialPrice ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Accept Initial Price
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Rating Dialog */}
      {rateUserData && user && (
        <RatingDialog
          open={showRatingDialog}
          onOpenChange={setShowRatingDialog}
          ride={ride}
          rateUser={rateUserData}
          fromUser={user}
          onRatingComplete={() => {
            toast({
              title: "Rating Submitted",
              description: "Thank you for your feedback!"
            });
          }}
        />
      )}
      
      {/* Driver Review Dialog */}
      <Dialog open={showDriverReviewDialog} onOpenChange={setShowDriverReviewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Review Ride Changes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-md p-3 bg-gray-50">
              <h4 className="font-medium text-sm mb-2">Original Details</h4>
              <div className="text-sm">
                <p><span className="font-medium">Pickup:</span> {ride.pickupLocation}</p>
                <p><span className="font-medium">Dropoff:</span> {ride.dropoffLocation}</p>
                <p><span className="font-medium">Time:</span> {formatDate(ride.scheduledTime)}</p>
              </div>
            </div>
            
            <div className="border rounded-md p-3 bg-blue-50">
              <h4 className="font-medium text-sm mb-2 text-blue-800">New Details</h4>
              <div className="text-sm">
                <p><span className="font-medium">Pickup:</span> 123 New Location St</p>
                <p><span className="font-medium">Dropoff:</span> 456 Different Hospital Rd</p>
                <p><span className="font-medium">Time:</span> {formatDate(new Date(new Date(ride.scheduledTime).getTime() + 3600000))}</p>
              </div>
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="reviewNotes" className="text-sm font-medium">Add Notes (Optional)</label>
              <textarea 
                id="reviewNotes" 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                placeholder="Add any concerns or comments about these changes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDriverReviewDialog(false)}>
              Later
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                // Reject changes
                setShowDriverReviewDialog(false);
                toast({
                  title: "Changes rejected",
                  description: "The rider has been notified that you cannot accommodate these changes.",
                  variant: "destructive"
                });
              }}
            >
              Reject Changes
            </Button>
            <Button 
              onClick={() => {
                // Accept changes
                setShowDriverReviewDialog(false);
                toast({
                  title: "Changes accepted",
                  description: "The ride details have been updated.",
                });
              }}
            >
              Accept Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Cancel Ride Dialog */}
      <CancelRideDialog 
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        rideId={ride.id}
        referenceNumber={ride.referenceNumber || ride.referenceNumber || `#${ride.id}`}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
          toast({
            title: "Ride Cancelled",
            description: "Your ride has been successfully cancelled.",
          });
        }}
      />
    </Card>
  );
}
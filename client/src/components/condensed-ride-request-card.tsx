import { format } from "date-fns";
import { Ride, Bid } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, MapPin, Calendar, Clock, Car, Accessibility, Truck, CreditCard, Trash2, Check } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import PaymentButton from "@/components/payment-button";
import { CancelRideDialog } from "@/components/cancel-ride-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CondensedRideRequestCardProps {
  ride: Ride;
  onSelect?: (ride: Ride) => void;
  bids?: Bid[];
  showPrice?: boolean;
  viewType: "rider" | "driver" | "admin";
}

export default function CondensedRideRequestCard({ 
  ride, 
  onSelect, 
  bids = [], 
  showPrice = true,
  viewType 
}: CondensedRideRequestCardProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const { toast } = useToast();

  // Mutation for accepting a bid
  const acceptBidMutation = useMutation({
    mutationFn: (bidId: number) => apiRequest(`/api/bids/${bidId}/accept`, 'POST'),
    onSuccess: () => {
      toast({
        title: "Bid Accepted",
        description: "The bid has been accepted and your ride is now scheduled!",
      });
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
      queryClient.invalidateQueries({ queryKey: [`/api/rides/${ride.id}/bids`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept the bid",
        variant: "destructive",
      });
    },
  });
  
  // Check if there are any new bids or counter offers that need rider's attention
  const hasNewBids = viewType === "rider" && 
                     ["requested", "bidding"].includes(ride.status) && 
                     bids.length > 0;

  // Helper function to get vehicle icon
  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType) {
      case 'wheelchair':
        return <Accessibility className="h-4 w-4" />;
      case 'stretcher':
        return <Truck className="h-4 w-4" />;
      default:
        return <Car className="h-4 w-4" />;
    }
  };

  // Helper function to format date
  const formatDate = (date: Date | string | null) => {
    if (!date) return "Not scheduled";
    try {
      const d = new Date(date);
      return format(d, "MMM d, h:mm a");
    } catch (error) {
      return "Invalid date";
    }
  };

  // Helper function to truncate address
  const truncateAddress = (address: string, maxLength: number = 35) => {
    if (!address) return "No address";
    return address.length > maxLength ? address.substring(0, maxLength) + "..." : address;
  };

  // Helper function for status badge
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
      <Badge className={`${color} rounded-full font-normal`}>{label}</Badge>
    );
  };

  // Calculate display price for a ride (consistent with ride details)
  const calculateDisplayPrice = (ride: Ride): string => {
    // Find the highest bid for this ride (if any)
    const highestBid = bids.length > 0 
      ? bids.reduce((max, bid) => (bid.amount > max.amount ? bid : max), bids[0]) 
      : null;
      
    // For scheduled/paid rides, use finalPrice if available
    if (['scheduled', 'paid', 'en_route', 'arrived', 'in_progress', 'completed'].includes(ride.status)) {
      if (ride.finalPrice) {
        return ride.finalPrice.toFixed(2);
      }
    }
    
    // For bidding phase, use highest bid if available
    if (['requested', 'bidding'].includes(ride.status) && highestBid) {
      return highestBid.amount.toFixed(2);
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

  // Handle click on the card (but not on buttons)
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click if clicking on buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    if (onSelect) {
      onSelect(ride);
    }
  };

  return (
    <div 
      className="w-full border rounded-lg overflow-hidden bg-white shadow-sm mb-3 hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Enhanced card with ride details preview */}
      <div className="p-4">
        {/* Header with price and status */}
        <div className="flex justify-between items-start mb-3">
          {showPrice && (
            <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-sm">
              ${calculateDisplayPrice(ride)}
            </div>
          )}
          
          <div className="flex items-center gap-2">
            {hasNewBids && (
              <Badge variant="destructive" className="animate-pulse text-xs">
                {bids.length} New {bids.length === 1 ? 'Bid' : 'Bids'}
              </Badge>
            )}
            {getStatusBadge(ride.status)}
          </div>
        </div>

        {/* Ride details */}
        <div className="space-y-2">
          {/* Date and time */}
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="font-medium">{formatDate(ride.scheduledTime)}</span>
            <div className="flex items-center gap-1 ml-2">
              {getVehicleIcon(ride.vehicleType)}
              <span className="text-xs text-gray-500 capitalize">{ride.vehicleType}</span>
            </div>
          </div>

          {/* Pickup location */}
          <div className="flex items-start gap-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">From</span>
              <p className="text-gray-900 font-medium">{truncateAddress(ride.pickupLocation)}</p>
            </div>
          </div>

          {/* Dropoff location */}
          <div className="flex items-start gap-2 text-sm">
            <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">To</span>
              <p className="text-gray-900 font-medium">{truncateAddress(ride.dropoffLocation)}</p>
            </div>
          </div>

          {/* Additional info for certain statuses */}
          {(ride as any).driverName && ["scheduled", "en_route", "arrived", "in_progress"].includes(ride.status) && (
            <div className="mt-3 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                  {(ride as any).driverName.charAt(0)}
                </div>
                <span>Driver: {(ride as any).driverName}</span>
              </div>
            </div>
          )}

          {/* Accept bid buttons for rides with pending bids */}
          {viewType === "rider" && ["requested", "bidding"].includes(ride.status) && bids.length > 0 && (
            <div className="mt-3 pt-2 border-t border-gray-100">
              <div className="space-y-2">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                  {bids.filter(bid => bid.status === 'pending').length} Available {bids.filter(bid => bid.status === 'pending').length === 1 ? 'Bid' : 'Bids'}
                </div>
                {bids
                  .filter(bid => bid.status === 'pending')
                  .slice(0, 2) // Show only first 2 bids to avoid cluttering
                  .map((bid) => (
                    <div key={bid.id} className="flex items-center justify-between bg-gray-50 rounded-md p-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                          {(bid as any).driverName?.charAt(0) || 'D'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            ${bid.amount.toFixed(2)}
                          </div>
                          {bid.notes && (
                            <div className="text-xs text-gray-500 truncate max-w-[120px]">
                              {bid.notes}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button 
                        size="sm"
                        variant="default"
                        className="bg-green-600 hover:bg-green-700 text-white h-7 px-3 text-xs"
                        disabled={acceptBidMutation.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          acceptBidMutation.mutate(bid.id);
                        }}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Accept Price
                      </Button>
                    </div>
                  ))}
                {bids.filter(bid => bid.status === 'pending').length > 2 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{bids.filter(bid => bid.status === 'pending').length - 2} more bids available
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action buttons for payment pending rides */}
          {viewType === "rider" && ["accepted", "payment_pending", "scheduled"].includes(ride.status) && (
            <div className="mt-3 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <PaymentButton ride={ride} className="text-sm h-8 px-3" />
                <Button 
                  size="sm" 
                  variant="outline"
                  className="text-sm h-8 px-3 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCancelDialog(true);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Cancel Ride Dialog */}
      <CancelRideDialog 
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        rideId={ride.id}
        referenceNumber={ride.referenceNumber || `RIDE-${ride.id}`}
      />
    </div>
  );
}
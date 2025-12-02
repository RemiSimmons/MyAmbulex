import { useState } from "react";
import { formatDate as formatDateUtil } from "@/lib/utils";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Ride, Bid } from "@shared/schema";
import {
  Calendar,
  MapPin,
  Clock,
  Car,
  DollarSign,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface RideRequestCardProps {
  ride: Ride;
  bids?: Bid[];
  viewType: "rider" | "driver" | "admin";
  onBidPlaced?: () => void;
}

export default function RideRequestCard({ ride, bids = [], viewType, onBidPlaced }: RideRequestCardProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Mutation for placing a bid (normal bid submission)
  const placeBidMutation = useMutation({
    mutationFn: async ({ rideId, amount }: { rideId: number; amount: number }) => {
      const response = await apiRequest("POST", "/api/bids", {
        rideId,
        amount,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/available-rides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/bids"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
      toast({
        title: "Bid Placed",
        description: "Your bid has been submitted successfully.",
      });
      onBidPlaced?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to place bid",
        variant: "destructive",
      });
    },
  });

  // Mutation for accepting rider's price (direct acceptance)
  const acceptPriceMutation = useMutation({
    mutationFn: async ({ rideId, amount }: { rideId: number; amount: number }) => {
      // First place the bid
      const bidResponse = await apiRequest("POST", "/api/bids", {
        rideId,
        amount,
      });
      const bidData = await bidResponse.json();
      
      // Since the rider set this price, we can accept it immediately
      // Note: In a real system, you might want the rider to explicitly accept first
      return bidData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/available-rides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/bids"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
      toast({
        title: "Price Accepted",
        description: "You've accepted the rider's price. The rider will be notified.",
      });
      onBidPlaced?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept price",
        variant: "destructive",
      });
    },
  });

  const formatDate = (date: any) => {
    try {
      return formatDateUtil(date, 'medium');
    } catch {
      return "Invalid date";
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      requested: { variant: "outline", label: "Requested" },
      bidding: { variant: "default", label: "Bidding" },
      scheduled: { variant: "secondary", label: "Scheduled" },
      completed: { variant: "default", label: "Completed" },
      cancelled: { variant: "destructive", label: "Cancelled" }
    };
    
    const config = statusMap[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const calculateDisplayPrice = (ride: Ride): string => {
    if (ride.finalPrice) {
      return ride.finalPrice.toFixed(2);
    }
    return ride.riderBid?.toFixed(2) || "0.00";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-medium text-gray-900">
              {ride.dropoffLocation?.split(',')[0] || ride.dropoffLocation}
            </h3>
            {getStatusBadge(ride.status)}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-4">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">{formatDate(ride.scheduledTime)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600 capitalize">{ride.vehicleType}</span>
              </div>
              
              <div className="flex items-center gap-1 text-green-700 font-semibold">
                <DollarSign className="h-4 w-4" />
                <span>{calculateDisplayPrice(ride)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Pickup</p>
                  <p className="text-sm text-gray-900">{ride.pickupLocation}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Dropoff</p>
                  <p className="text-sm text-gray-900">{ride.dropoffLocation}</p>
                </div>
              </div>
            </div>

            {ride.specialInstructions && (
              <div className="mt-3 p-3 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Special Instructions</p>
                <p className="text-sm text-gray-700">{ride.specialInstructions}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {viewType === "rider" && ride.status === "bidding" && (
              <Badge variant="outline" className="bg-gray-50">
                <span className="font-medium text-xs">{bids.length} Bid{bids.length !== 1 ? 's' : ''}</span>
              </Badge>
            )}
          </div>
          
          <div className="flex gap-2">
            {viewType === "rider" && ["requested", "bidding"].includes(ride.status) && (
              <Button size="sm" variant="outline">
                View Details
              </Button>
            )}
            
            {viewType === "driver" && ["requested", "bidding"].includes(ride.status) && (
              <div className="flex gap-2">
                {bids.length > 0 ? (
                  // Driver has existing bids on this ride
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setLocation(`/driver/bid/${ride.id}`)}
                  >
                    View Bid
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                ) : (
                  // No existing bids - show original options
                  <>
                    {ride.riderBid && (
                      <Button 
                        size="sm" 
                        onClick={() => {
                          if (!ride.riderBid) return;
                          acceptPriceMutation.mutate({ rideId: ride.id, amount: ride.riderBid });
                        }}
                        disabled={acceptPriceMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {acceptPriceMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          `Accept $${ride.riderBid.toFixed(2)}`
                        )}
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setLocation(`/driver/bid/${ride.id}`)}
                    >
                      Place Bid
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
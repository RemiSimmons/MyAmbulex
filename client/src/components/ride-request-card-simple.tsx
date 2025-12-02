import { useState } from "react";
import { format } from "date-fns";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ride, Bid } from "@shared/schema";
import {
  Calendar,
  MapPin,
  Clock,
  Car,
  DollarSign,
} from "lucide-react";

interface RideRequestCardProps {
  ride: Ride;
  bids?: Bid[];
  viewType: "rider" | "driver" | "admin";
}

export default function RideRequestCard({ ride, bids = [], viewType }: RideRequestCardProps) {
  const formatDate = (date: any) => {
    try {
      return format(new Date(date), "MMM dd, yyyy 'at' hh:mm a");
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
                <span>${calculateDisplayPrice(ride)}</span>
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
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
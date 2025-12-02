import React, { useEffect } from 'react';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Car, 
  CheckCircle, 
  Clock, 
  Calendar,
  DollarSign,
  Loader2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Ride } from "@shared/schema";
// WebSocket removed - using polling system

interface RideProgressIndicatorProps {
  ride: Ride;
  className?: string;
}

// Define the ride status sequence for the progress bar
const RIDE_STATUS_SEQUENCE = [
  "requested",
  "bidding",
  "scheduled",
  "paid",
  "en_route",
  "arrived",
  "in_progress",
  "completed"
];

// A map of ride statuses to display-friendly labels
const STATUS_LABELS: Record<string, string> = {
  requested: "Requested",
  bidding: "Bidding",
  scheduled: "Scheduled",
  paid: "Paid",
  en_route: "En Route",
  arrived: "Arrived", 
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  payment_pending: "Payment Pending",
  edit_pending: "Edit Pending"
};

// Custom status colors
const STATUS_COLORS: Record<string, string> = {
  requested: "bg-gray-100 text-gray-800 border-gray-200",
  bidding: "bg-blue-100 text-blue-800 border-blue-200",
  scheduled: "bg-purple-100 text-purple-800 border-purple-200",
  payment_pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  paid: "bg-green-100 text-green-800 border-green-200",
  en_route: "bg-yellow-100 text-yellow-800 border-yellow-200 animate-pulse",
  arrived: "bg-indigo-100 text-indigo-800 border-indigo-200",
  in_progress: "bg-orange-100 text-orange-800 border-orange-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  edit_pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

// Icons for each status
const STATUS_ICONS: Record<string, React.ReactNode> = {
  requested: <Clock className="h-4 w-4" />,
  bidding: <DollarSign className="h-4 w-4" />,
  scheduled: <Calendar className="h-4 w-4" />,
  payment_pending: <DollarSign className="h-4 w-4" />,
  paid: <DollarSign className="h-4 w-4" />,
  en_route: <Car className="h-4 w-4" />,
  arrived: <MapPin className="h-4 w-4" />,
  in_progress: <Car className="h-4 w-4" />,
  completed: <CheckCircle className="h-4 w-4" />,
  cancelled: <Loader2 className="h-4 w-4" />,
  edit_pending: <Clock className="h-4 w-4" />
};

export function RideProgressIndicator({ ride, className }: RideProgressIndicatorProps) {
  // WebSocket removed - using polling system for real-time updates
  
  useEffect(() => {
    // Placeholder for future real-time tracking implementation
    // Currently using React Query polling for updates
  }, [ride?.id]);
  
  // Calculate progress percentage based on status
  const calculateProgress = () => {
    if (ride.status === "cancelled") return 0;
    
    const currentIndex = RIDE_STATUS_SEQUENCE.indexOf(ride.status);
    if (currentIndex === -1) return 0;
    
    // Calculate progress as a percentage of the total flow
    return Math.round((currentIndex / (RIDE_STATUS_SEQUENCE.length - 1)) * 100);
  };
  
  // Get status badge with icon
  const getStatusBadge = () => {
    const badgeClass = STATUS_COLORS[ride.status] || "bg-gray-100 text-gray-800 border-gray-200";
    const icon = STATUS_ICONS[ride.status] || <Clock className="h-4 w-4" />;
    const label = STATUS_LABELS[ride.status] || ride.status;
    
    return (
      <Badge variant="outline" className={cn("font-normal capitalize text-sm", badgeClass)}>
        <span className="mr-1.5">{icon}</span>
        {label}
      </Badge>
    );
  };
  
  return (
    <div className={cn("space-y-4", className)}>
      {/* Status Badge */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          
        </div>
        
        <div className="text-xs text-gray-500">
          Auto-refresh enabled
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="space-y-2">
        <Progress value={calculateProgress()} className="h-2" />
        
        {/* Progress Steps */}
        <div className="grid grid-cols-4 text-xs text-gray-500 -mx-2">
          <div className={cn(
            "text-center",
            (ride.status === "requested" || ride.status === "bidding") ? "text-primary font-medium" : ""
          )}>
            <div className="truncate px-1">Requested</div>
          </div>
          
          <div className={cn(
            "text-center",
            (ride.status === "scheduled" || ride.status === "paid") ? "text-primary font-medium" : ""
          )}>
            <div className="truncate px-1">Scheduled</div>
          </div>
          
          <div className={cn(
            "text-center",
            (ride.status === "en_route" || ride.status === "arrived") ? "text-primary font-medium" : ""
          )}>
            <div className="truncate px-1">En Route</div>
          </div>
          
          <div className={cn(
            "text-center",
            (ride.status === "in_progress" || ride.status === "completed") ? "text-primary font-medium" : ""
          )}>
            <div className="truncate px-1">Completed</div>
          </div>
        </div>
      </div>
      
      {ride.status === "en_route" && (
        <div className="text-sm">
          <p className="text-blue-600">Your driver is on the way to pick you up.</p>
        </div>
      )}
      
      {ride.status === "arrived" && (
        <div className="text-sm">
          <p className="text-indigo-600 font-medium">Your driver has arrived at the pickup location!</p>
        </div>
      )}
      
      {ride.status === "in_progress" && (
        <div className="text-sm">
          <p className="text-orange-600">You are currently en route to your destination.</p>
        </div>
      )}
    </div>
  );
}
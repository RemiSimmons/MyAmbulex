import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface CancelRideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rideId: number;
  referenceNumber: string;
  onSuccess?: () => void;
}

export function CancelRideDialog({
  open,
  onOpenChange,
  rideId,
  referenceNumber,
  onSuccess,
}: CancelRideDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");

  const handleCancel = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/rides/${rideId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          cancellationReason 
        }),
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to cancel ride: ${response.status} ${response.statusText} - ${errorData}`);
      }
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
      
      // Show success toast
      toast({
        title: "Ride Cancelled",
        description: `Your ride (${referenceNumber}) has been successfully cancelled.`,
      });
      
      // Close dialog
      onOpenChange(false);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error cancelling ride:", error);
      toast({
        title: "Cancellation Failed",
        description: "There was an error cancelling your ride. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
            Confirm Ride Cancellation
          </DialogTitle>
          <DialogDescription>
            You are about to cancel ride {referenceNumber}. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="cancellationReason">Reason for cancellation (optional)</Label>
            <Textarea
              id="cancellationReason"
              placeholder="Please provide a reason for cancellation..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          
          <div className="rounded-md bg-yellow-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Cancellation policy</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Rides can be cancelled without penalty up to 24 hours before the scheduled pickup time.
                    Cancellations within 24 hours may incur a cancellation fee based on our policy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="sm:w-auto w-full"
            disabled={isSubmitting}
          >
            Keep My Ride
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            className="sm:w-auto w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              "Cancel Ride"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
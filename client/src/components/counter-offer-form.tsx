import { useState, useEffect } from "react";
import { Bid } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BidSlider } from "@/components/bid-slider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CounterOfferFormProps {
  originalBid: Bid;
  rideId: number;
  onComplete?: () => void;
  onCancel?: () => void;
  role: "rider" | "driver";
  maxCounterOffers?: number;
}

export function CounterOfferForm({
  originalBid,
  rideId,
  onComplete,
  onCancel,
  role,
  maxCounterOffers = 3
}: CounterOfferFormProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState(originalBid.amount);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalBids, setTotalBids] = useState(1); // Default to 1 (the current bid)
  const [showFinalConfirmation, setShowFinalConfirmation] = useState(false);
  
  // Fetch all bids for this ride to check counter-offer limit
  const [isFetchingBids, setIsFetchingBids] = useState(true);
  
  // Fetch counter-offer count for this specific bid chain when component mounts
  useEffect(() => {
    const fetchCounterOfferCount = async () => {
      try {
        const response = await fetch(`/api/bids/${originalBid.id}/counter-count`);
        
        if (response.ok) {
          const data = await response.json();
          // totalBids includes the original bid + counter offers made
          setTotalBids((data.counterOfferCount || 0) + 1);
        }
      } catch (error) {
        console.error("Error fetching counter-offer count:", error);
        // Fallback: check bidCount from original bid if available
        setTotalBids((originalBid.bidCount || 1));
      } finally {
        setIsFetchingBids(false);
      }
    };
    
    fetchCounterOfferCount();
  }, [originalBid.id, originalBid.bidCount]);

  // Calculate min and max values based on the original bid and user role
  const calculateMinMax = () => {
    // Both riders and drivers can now counter-offer 30% higher or lower
    return {
      min: originalBid.amount * 0.7, // Allow up to 30% reduction
      max: originalBid.amount * 1.3, // Allow up to 30% increase
      defaultValue: originalBid.amount // Default to original price
    };
  };

  const { min, max, defaultValue } = calculateMinMax();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Check if this is the final counter-offer and show confirmation
    const isLastOffer = remainingOffers === 1;
    if (isLastOffer && !showFinalConfirmation) {
      setShowFinalConfirmation(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiRequest("POST", `/api/bids/${originalBid.id}/counter`, {
        amount,
        notes: notes.trim() || undefined
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit counter-offer");
      }

      toast({
        title: "Counter-offer submitted",
        description: role === "rider" 
          ? "Your counter-offer has been sent to the driver" 
          : "Your counter-offer has been sent to the rider",
      });

      // Invalidate relevant queries to update the UI
      queryClient.invalidateQueries({ queryKey: ["/api/bids"] });
      queryClient.invalidateQueries({ queryKey: [`/api/bids/ride/${rideId}`] });
      
      setShowFinalConfirmation(false);
      if (onComplete) onComplete();
    } catch (error) {
      toast({
        title: "Error submitting counter-offer",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalConfirmation = () => {
    setShowFinalConfirmation(false);
    handleSubmit({ preventDefault: () => {} } as React.FormEvent);
  };

  // Calculate remaining offers correctly: start with max (3) and subtract bids already made
  // For the first bid, we should show "3 of 3 offers left"
  // For the second bid, we should show "2 of 3 offers left"  
  // For the third bid, we should show "1 of 3 offers left" with final offer warning
  const remainingOffers = Math.max(0, maxCounterOffers - (totalBids - 1));
  const canCounter = remainingOffers > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <div className="flex justify-between items-center mb-2">
          <div className="text-sm font-medium">Counter-offer Amount</div>
          <div className="text-lg font-semibold">${amount.toFixed(2)}</div>
        </div>
        
        {isFetchingBids ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : canCounter ? (
          <BidSlider
            key={`counter-${originalBid.id}-${totalBids}`}
            minValue={min}
            maxValue={max}
            defaultValue={defaultValue}
            step={1}
            onChange={setAmount}
            suggestedPrice={defaultValue}
          />
        ) : (
          <div className="text-red-500 text-sm py-2">
            Maximum number of counter-offers reached (limit: {maxCounterOffers})
          </div>
        )}
        
        <div className="text-xs text-gray-500 mt-1 flex justify-between">
          <span>Min: ${min.toFixed(2)}</span>
          <span>Remaining offers: {remainingOffers} of {maxCounterOffers}</span>
          <span>Max: ${max.toFixed(2)}</span>
        </div>
        
        <div className="text-xs text-blue-600 mt-2 bg-blue-50 p-2 rounded">
          <p className="font-medium">30% Flexibility Rule:</p>
          <p>You can adjust your offer by up to 30% higher or lower than the original amount.</p>
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium mb-1">
          Notes (optional)
        </label>
        <Textarea
          id="notes"
          placeholder="Add any notes or special requirements..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={!canCounter || isSubmitting || isFetchingBids}
          className="resize-none"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          type="submit"
          disabled={!canCounter || isSubmitting || isFetchingBids}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Counter-offer"
          )}
        </Button>
      </div>

      {/* Final Counter-Offer Confirmation Dialog */}
      <Dialog open={showFinalConfirmation} onOpenChange={setShowFinalConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Final Counter-Offer
            </DialogTitle>
            <DialogDescription>
              This is your last counter-offer for this ride. After this, no more negotiation will be possible. 
              The {role === "rider" ? "driver" : "rider"} will need to accept or decline your offer of ${amount.toFixed(2)}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowFinalConfirmation(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleFinalConfirmation}
              disabled={isSubmitting}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Final Offer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
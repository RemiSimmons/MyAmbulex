import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Ride } from '@shared/schema';

interface PaymentButtonProps {
  ride: Ride;
  className?: string;
}

export default function PaymentButton({ ride, className = '' }: PaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handlePayment = () => {
    console.log('🟢 PaymentButton clicked for ride:', ride.id);
    console.log('🟢 Ride status:', ride.status);
    console.log('🟢 Final price:', ride.finalPrice);
    
    try {
      setIsLoading(true);
      console.log('🟢 Setting loading state to true');
      
      // Navigate to payment page with ride ID
      const paymentUrl = `/payment?rideId=${ride.id}`;
      console.log('🟢 Navigating to:', paymentUrl);
      setLocation(paymentUrl);
      
      console.log('🟢 Navigation completed');
    } catch (error) {
      console.error('🔴 Error in PaymentButton handlePayment:', error);
      toast({
        title: "Error",
        description: "Could not process payment request",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  // Show button for accepted rides that need payment setup
  if (!['accepted', 'scheduled', 'payment_pending'].includes(ride.status)) {
    return null;
  }

  return (
    <Button 
      onClick={handlePayment} 
      className={`${className} bg-green-600 hover:bg-green-700`}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-4 w-4" />
          Pay Now
        </>
      )}
    </Button>
  );
}
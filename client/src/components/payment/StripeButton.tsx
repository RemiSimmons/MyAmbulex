import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StripeButtonProps {
  onSuccess?: (data: any) => void;
  onCancel?: () => void;
  onError?: (error: any) => void;
}

export default function StripeButton({
  onSuccess,
  onCancel,
  onError
}: StripeButtonProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
        
        if (onError) {
          onError(error);
        }
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        toast({
          title: "Payment Successful",
          description: "Thank you for your payment!",
        });
        
        if (onSuccess) {
          onSuccess(paymentIntent);
        }
      } else {
        // Handle other statuses or redirect the customer to another page
        if (onCancel) {
          onCancel();
        }
      }
    } catch (err) {
      console.error("Payment error:", err);
      
      if (onError) {
        onError(err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <PaymentElement 
        className="mb-6" 
        options={{
          paymentMethodTypes: ['card', 'cashapp']
        }}
      />
      <Button 
        type="submit" 
        className="w-full h-12" 
        disabled={!stripe || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>Pay Now</>
        )}
      </Button>
    </form>
  );
}
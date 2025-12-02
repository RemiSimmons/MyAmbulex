import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Shield, Check, Loader2 } from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY!);

interface PaymentSetupProps {
  onComplete: () => void;
}

const PaymentSetupForm = ({ onComplete }: PaymentSetupProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Setup Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (setupIntent && setupIntent.status === 'succeeded') {
        // Confirm payment method setup on our server
        const response = await apiRequest("POST", "/api/stripe/confirm-payment-method", {
          paymentMethodId: setupIntent.payment_method,
        });

        if (response.ok) {
          toast({
            title: "Payment Method Added!",
            description: "Your payment method has been securely saved.",
          });
          onComplete();
        } else {
          throw new Error('Failed to save payment method');
        }
      }
    } catch (error: any) {
      toast({
        title: "Setup Error",
        description: error.message || "Failed to set up payment method",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 text-blue-800 mb-2">
          <Shield className="w-4 h-4" />
          <span className="font-medium">Secure Payment Setup</span>
        </div>
        <p className="text-sm text-blue-700">
          Your payment information is encrypted and stored securely by Stripe. 
          You'll only be charged when you accept a ride.
        </p>
      </div>

      <PaymentElement 
        options={{
          layout: 'tabs',
          paymentMethodOrder: ['card'],
        }}
      />

      <Button 
        type="submit" 
        disabled={!stripe || isProcessing}
        className="w-full"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Setting Up Payment Method...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Add Payment Method
          </>
        )}
      </Button>
    </form>
  );
};

export const PaymentSetup = ({ onComplete }: PaymentSetupProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Check if user already has payment method
  const { data: paymentStatus, isLoading } = useQuery({
    queryKey: ["/api/stripe/payment-method-status"],
    enabled: !!user,
  });

  // Get setup intent for payment method collection
  const { data: setupIntent, isLoading: isLoadingSetup, refetch: refetchSetup } = useQuery({
    queryKey: ["/api/stripe/setup-intent"],
    enabled: !!user && !paymentStatus?.hasPaymentMethod,
    staleTime: 0, // Always fetch fresh setup intent
  });

  useEffect(() => {
    if (paymentStatus?.hasPaymentMethod) {
      toast({
        title: "Payment Method Already Set Up",
        description: "You already have a payment method configured.",
      });
      onComplete();
    }
  }, [paymentStatus, onComplete, toast]);

  if (isLoading || isLoadingSetup) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading payment setup...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (paymentStatus?.hasPaymentMethod) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Check className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Payment Method Ready</h3>
            <p className="text-gray-600 mb-4">
              You have a {paymentStatus.paymentMethod?.brand} card ending in {paymentStatus.paymentMethod?.last4}
            </p>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Ready for automatic payments
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!setupIntent?.clientSecret) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">Unable to initialize payment setup.</p>
            <Button onClick={() => refetchSetup()}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Add Payment Method
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Elements 
          stripe={stripePromise} 
          options={{ 
            clientSecret: setupIntent.clientSecret,
            appearance: {
              theme: 'stripe',
              variables: {
                colorPrimary: '#3b82f6',
                colorBackground: '#ffffff',
                colorText: '#374151',
                colorDanger: '#ef4444',
                fontFamily: 'Inter, system-ui, sans-serif',
                spacingUnit: '4px',
                borderRadius: '8px',
              },
            },
          }}
        >
          <PaymentSetupForm onComplete={onComplete} />
        </Elements>
      </CardContent>
    </Card>
  );
};
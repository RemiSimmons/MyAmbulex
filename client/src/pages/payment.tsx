import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from "@stripe/react-stripe-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Ride } from "@shared/schema";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing VITE_STRIPE_PUBLIC_KEY environment variable');
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface PaymentFormProps {
  ride: Ride;
  clientSecret: string;
  onSuccess: () => void;
}

const PaymentForm = ({ ride, clientSecret, onSuccess }: PaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/rider/dashboard`,
        },
      });

      if (result.error) {
        toast({
          title: "Payment Failed",
          description: result.error.message,
          variant: "destructive",
        });
      } else {
        // Payment succeeded
        toast({
          title: "Payment Successful",
          description: "Your ride payment has been processed successfully.",
        });
        onSuccess();
      }
    } catch (error) {
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing Payment...
          </>
        ) : (
          `Pay $${ride.finalPrice?.toFixed(2) || '0.00'}`
        )}
      </Button>
    </form>
  );
};

export default function PaymentPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [ride, setRide] = useState<Ride | null>(null);
  const [clientSecret, setClientSecret] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  
  // Get ride ID from URL parameters
  const rideId = new URLSearchParams(window.location.search).get('rideId');

  useEffect(() => {
    if (!rideId) {
      toast({
        title: "Invalid Payment Link",
        description: "No ride specified for payment.",
        variant: "destructive",
      });
      setLocation('/rider/dashboard');
      return;
    }

    loadPaymentData();
  }, [rideId]);

  const loadPaymentData = async () => {
    try {
      setIsLoading(true);

      // Get ride details
      const rideResponse = await apiRequest('GET', `/api/rides/${rideId}`);
      const rideData = await rideResponse.json();
      setRide(rideData);

      // Create payment intent
      const paymentResponse = await apiRequest('POST', '/api/create-payment-intent', {
        rideId: parseInt(rideId!)
      });
      const paymentData = await paymentResponse.json();
      setClientSecret(paymentData.clientSecret);

    } catch (error) {
      console.error('🔴 Payment setup error:', error);
      toast({
        title: "Payment Setup Failed",
        description: "Unable to initialize payment. Please try again.",
        variant: "destructive",
      });
      setLocation('/rider/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setLocation('/rider/dashboard');
  };

  const handleBackClick = () => {
    setLocation('/rider/dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-gray-600">Setting up payment...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!ride || !clientSecret) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-center text-red-600">Payment Error</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p>Unable to load payment information.</p>
              <Button onClick={handleBackClick} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center space-x-4">
            <Button onClick={handleBackClick} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold">Complete Payment</h1>
          </div>

          {/* Ride Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ride Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">From</p>
                <p className="font-medium">{ride.pickupLocation}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">To</p>
                <p className="font-medium">{ride.dropoffLocation}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Driver</p>
                <p className="font-medium">Assigned Driver</p>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Amount</span>
                  <span className="text-xl font-bold">${ride.finalPrice?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <PaymentForm
                  ride={ride}
                  clientSecret={clientSecret}
                  onSuccess={handlePaymentSuccess}
                />
              </Elements>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
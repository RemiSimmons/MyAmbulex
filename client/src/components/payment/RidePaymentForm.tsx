
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, CreditCard, DollarSign } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { PaymentProcessor } from './PaymentProcessor';

interface RidePaymentFormProps {
  rideId: number;
  amount: number;
  onPaymentSuccess?: () => void;
}

export function RidePaymentForm({ rideId, amount, onPaymentSuccess }: RidePaymentFormProps) {
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal' | null>(null);
  const { toast } = useToast();

  // Create payment intent mutation
  const createPaymentIntentMutation = useMutation({
    mutationFn: async (data: { rideId: number; amount: number }) => {
      const response = await fetch('/api/payment/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }
      
      return response.json();
    },
  });

  // Confirm payment mutation
  const confirmPaymentMutation = useMutation({
    mutationFn: async (data: { rideId: number; paymentIntentId: string }) => {
      const response = await fetch('/api/payment/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to confirm payment');
      }
      
      return response.json();
    },
  });

  const handlePaymentSuccess = async (paymentResult: any, method: 'stripe' | 'paypal') => {
    try {
      setPaymentStatus('processing');
      
      // For Stripe, confirm the payment
      if (method === 'stripe' && paymentResult.paymentIntent) {
        await confirmPaymentMutation.mutateAsync({
          rideId,
          paymentIntentId: paymentResult.paymentIntent.id,
        });
      }
      
      setPaymentStatus('success');
      setPaymentMethod(method);
      
      toast({
        title: 'Payment Successful',
        description: `Your payment of $${amount.toFixed(2)} has been processed successfully.`,
      });
      
      onPaymentSuccess?.();
      
    } catch (error) {
      console.error('Payment confirmation error:', error);
      setPaymentStatus('error');
      
      toast({
        title: 'Payment Confirmation Failed',
        description: 'Payment was processed but confirmation failed. Please contact support.',
        variant: 'destructive',
      });
    }
  };

  const handlePaymentError = (error: any, method: 'stripe' | 'paypal') => {
    console.error('Payment error:', error);
    setPaymentStatus('error');
    
    toast({
      title: 'Payment Failed',
      description: `There was an error processing your ${method} payment: ${error.message || 'Unknown error'}`,
      variant: 'destructive',
    });
  };

  if (paymentStatus === 'success') {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert className="border-green-600 bg-green-50">
            <DollarSign className="h-5 w-5 text-green-600" />
            <AlertDescription className="text-green-600">
              Payment of ${amount.toFixed(2)} completed successfully via {paymentMethod}!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Complete Payment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-4 bg-muted/30 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Amount:</span>
            <span className="text-2xl font-bold">${amount.toFixed(2)}</span>
          </div>
        </div>

        {paymentStatus === 'error' && (
          <Alert className="mb-4 border-red-600 bg-red-50">
            <AlertDescription className="text-red-600">
              Payment failed. Please try again or contact support.
            </AlertDescription>
          </Alert>
        )}

        <PaymentProcessor
          amount={amount}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          disabled={paymentStatus === 'processing'}
          metadata={{ rideId: rideId.toString() }}
        />

        {paymentStatus === 'processing' && (
          <div className="mt-4 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span>Processing payment...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

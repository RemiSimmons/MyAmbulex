import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import PaymentProcessor from '@/components/payment/PaymentProcessor';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function PaymentDemo() {
  const [amount, setAmount] = useState<number>(25);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal' | null>(null);
  const { toast } = useToast();

  // Handle successful payment
  const handlePaymentSuccess = (data: any, method: 'stripe' | 'paypal') => {
    console.log(`Payment successful via ${method}:`, data);
    setPaymentStatus('success');
    setPaymentMethod(method);
    
    toast({
      title: 'Payment Successful',
      description: `Your payment of $${amount.toFixed(2)} has been processed successfully via ${method === 'stripe' ? 'credit card' : 'PayPal'}.`,
      variant: 'default',
    });
  };

  // Handle payment cancellation
  const handlePaymentCancel = (method: 'stripe' | 'paypal') => {
    console.log(`Payment cancelled via ${method}`);
    setPaymentStatus('idle');
    setShowPayment(false);
    
    toast({
      title: 'Payment Cancelled',
      description: 'Your payment has been cancelled.',
      variant: 'default',
    });
  };

  // Handle payment error
  const handlePaymentError = (error: any, method: 'stripe' | 'paypal') => {
    console.error(`Payment error via ${method}:`, error);
    setPaymentStatus('error');
    
    toast({
      title: 'Payment Failed',
      description: `There was an error processing your payment: ${error.message || 'Unknown error'}`,
      variant: 'destructive',
    });
  };

  // Reset payment flow
  const resetPayment = () => {
    setShowPayment(false);
    setPaymentStatus('idle');
    setPaymentMethod(null);
  };

  // Start payment flow
  const initiatePayment = () => {
    if (!amount || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid payment amount.',
        variant: 'destructive',
      });
      return;
    }
    
    setShowPayment(true);
    setPaymentStatus('idle');
  };

  return (
    <div className="container max-w-3xl py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">Payment Options Demo</h1>
      
      {paymentStatus === 'success' ? (
        <Alert className="mb-6 border-green-600 bg-green-50">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-600">Payment Successful!</AlertTitle>
          <AlertDescription>
            Thank you for your payment of ${amount.toFixed(2)} via {paymentMethod === 'stripe' ? 'credit card' : 'PayPal'}.
          </AlertDescription>
          
          <Button 
            onClick={resetPayment} 
            className="mt-4 w-full"
          >
            New Payment
          </Button>
        </Alert>
      ) : paymentStatus === 'error' ? (
        <Alert className="mb-6 border-red-600 bg-red-50">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertTitle className="text-red-600">Payment Failed</AlertTitle>
          <AlertDescription>
            There was an error processing your payment. Please try again or contact support.
          </AlertDescription>
          
          <Button 
            onClick={resetPayment} 
            className="mt-4 w-full"
          >
            Try Again
          </Button>
        </Alert>
      ) : !showPayment ? (
        <Card>
          <CardHeader>
            <CardTitle>Enter Payment Amount</CardTitle>
            <CardDescription>
              Choose an amount to test the payment options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={initiatePayment} 
              className="w-full"
              disabled={!amount || amount <= 0}
            >
              Continue to Payment
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Choose Payment Method</h2>
            <Button 
              variant="outline" 
              onClick={resetPayment}
            >
              Change Amount
            </Button>
          </div>
          
          <div className="bg-muted/30 rounded-lg p-4 mb-6">
            <div className="flex justify-between">
              <span>Total Amount:</span>
              <span className="font-bold text-lg">${amount.toFixed(2)}</span>
            </div>
          </div>
          
          <PaymentProcessor
            amount={amount}
            currency="USD"
            onSuccess={handlePaymentSuccess}
            onCancel={handlePaymentCancel}
            onError={handlePaymentError}
          />
        </>
      )}
    </div>
  );
}
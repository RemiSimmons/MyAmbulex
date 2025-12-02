import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import PayPalButton from './PayPalButton';
import StripeButton from './StripeButton';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, DollarSign, CreditCard } from 'lucide-react';
import { isPaymentMethodEnabled } from '@/lib/beta-config';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface PaymentProcessorProps {
  amount: number;
  currency?: string;
  onSuccess?: (data: any, method: 'stripe' | 'paypal' | 'cashapp') => void;
  onCancel?: (method: 'stripe' | 'paypal' | 'cashapp') => void;
  onError?: (error: any, method: 'stripe' | 'paypal' | 'cashapp') => void;
}

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export function PaymentProcessor({
  amount, 
  currency = 'USD',
  onSuccess,
  onCancel,
  onError
}: PaymentProcessorProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'stripe' | 'paypal' | 'cashapp'>('cashapp');
  
  // Beta testing: PayPal integration disabled
  const isPayPalEnabled = isPaymentMethodEnabled('paypal');
  
  useEffect(() => {
    if (selectedMethod === 'stripe') {
      setLoading(true);
      // Create PaymentIntent as soon as the page loads or when amount changes
      apiRequest("POST", "/api/create-payment-intent", { 
        amount: amount,
        currency: currency.toLowerCase()
      })
        .then((res) => res.json())
        .then((data) => {
          setClientSecret(data.clientSecret);
          setLoading(false);
        })
        .catch(error => {
          console.error("Error creating payment intent:", error);
          setLoading(false);
          if (onError) {
            onError(error, 'stripe');
          }
        });
    }
  }, [amount, currency, selectedMethod]);

  const handleStripeSuccess = (data: any) => {
    if (onSuccess) {
      onSuccess(data, 'stripe');
    }
  };

  const handleStripeCancel = () => {
    if (onCancel) {
      onCancel('stripe');
    }
  };

  const handleStripeError = (error: any) => {
    if (onError) {
      onError(error, 'stripe');
    }
  };

  const handlePayPalSuccess = (data: any) => {
    if (onSuccess) {
      onSuccess(data, 'paypal');
    }
  };

  const handlePayPalCancel = (data: any) => {
    if (onCancel) {
      onCancel('paypal');
    }
  };

  const handlePayPalError = (error: any) => {
    if (onError) {
      onError(error, 'paypal');
    }
  };

  const handleCashAppPayment = () => {
    // Simulate CashApp payment flow
    if (onSuccess) {
      onSuccess({ method: 'cashapp', amount }, 'cashapp');
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <Tabs defaultValue="cashapp" onValueChange={(value) => setSelectedMethod(value as 'stripe' | 'paypal' | 'cashapp')}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="cashapp" className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span>Cash App Pay</span>
            </TabsTrigger>
            <TabsTrigger value="stripe" className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4" />
              <span>Card</span>
            </TabsTrigger>
            <TabsTrigger value="paypal" disabled={!isPayPalEnabled} className={!isPayPalEnabled ? "opacity-50 cursor-not-allowed" : ""}>
              Klarna {!isPayPalEnabled && "(Coming Soon)"}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="cashapp">
            <div className="space-y-4">
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <DollarSign className="h-16 w-16 mx-auto text-green-600 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Cash App Pay</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Fast and secure payment with Cash App
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleCashAppPayment} 
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Pay ${amount.toFixed(2)} with Cash App
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="stripe">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <StripeButton 
                  onSuccess={handleStripeSuccess}
                  onCancel={handleStripeCancel}
                  onError={handleStripeError}
                />
              </Elements>
            ) : (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="paypal">
            {isPayPalEnabled ? (
              <div className="py-4">
                <PayPalButton 
                  amount={amount.toString()}
                  currency={currency}
                  intent="CAPTURE"
                  onSuccess={handlePayPalSuccess}
                  onCancel={handlePayPalCancel}
                  onError={handlePayPalError}
                />
              </div>
            ) : (
              <div className="py-8 text-center">
                <div className="text-gray-500 mb-4">
                  Klarna integration is currently disabled for beta testing.
                </div>
                <div className="text-sm text-gray-400">
                  Please use Cash App Pay or credit card payment for now. Klarna will be available soon!
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default PaymentProcessor;
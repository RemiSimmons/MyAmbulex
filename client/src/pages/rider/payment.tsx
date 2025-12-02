import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { PaymentProcessor } from '@/components/payment/PaymentProcessor';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PaymentPageData {
  rideId: string;
  amount: number;
  rideDetails?: {
    pickupLocation: string;
    dropoffLocation: string;
    scheduledTime: string;
    driverName?: string;
  };
}

export default function PaymentPage() {
  const [paymentData, setPaymentData] = useState<PaymentPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ rideId: string }>('/rider/payment/:rideId');
  const rideId = params?.rideId;

  useEffect(() => {
    if (!rideId) {
      setError("No ride ID provided");
      setIsLoading(false);
      return;
    }

    async function fetchPaymentData() {
      try {
        // Fetch ride details for payment
        const rideResponse = await apiRequest('GET', `/api/rides/${rideId}`);
        const ride = await rideResponse.json();
        
        if (!rideResponse.ok || !ride) {
          throw new Error('Ride not found');
        }

        setPaymentData({
          rideId: rideId,
          amount: ride.finalPrice || ride.final_price,
          rideDetails: {
            pickupLocation: ride.pickupLocation || ride.pickup_location,
            dropoffLocation: ride.dropoffLocation || ride.dropoff_location,
            scheduledTime: ride.scheduledTime || ride.scheduled_time,
            driverName: ride.driverName || 'Assigned Driver'
          }
        });
      } catch (err) {
        console.error('Payment data fetch error:', err);
        setError("Failed to load ride information");
        toast({
          title: "Error",
          description: "Failed to load ride information",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchPaymentData();
  }, [rideId, toast]);

  const handlePaymentSuccess = (data: any, method: 'stripe' | 'paypal' | 'cashapp') => {
    toast({
      title: "Payment Successful",
      description: `Your payment has been processed successfully via ${method === 'stripe' ? 'credit card' : method === 'cashapp' ? 'Cash App Pay' : 'PayPal'}.`
    });
    
    // Redirect to dashboard after success
    setTimeout(() => {
      setLocation('/rider/dashboard');
    }, 1500);
  };

  const handlePaymentError = (error: any, method: 'stripe' | 'paypal' | 'cashapp') => {
    console.error('Payment error:', error);
    toast({
      title: "Payment Failed",
      description: error?.message || "An error occurred while processing your payment.",
      variant: "destructive"
    });
  };

  const handlePaymentCancel = (method: 'stripe' | 'paypal' | 'cashapp') => {
    toast({
      title: "Payment Cancelled",
      description: "You can retry payment at any time from your dashboard."
    });
  };

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={() => setLocation('/rider/dashboard')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Complete Payment</CardTitle>
          <CardDescription>
            Complete your payment for ride #{rideId}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : paymentData ? (
            <div className="space-y-6">
              {/* Ride Summary */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Ride Summary</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">From:</span>
                    <br />
                    <span className="text-muted-foreground">{paymentData.rideDetails?.pickupLocation}</span>
                  </div>
                  <div>
                    <span className="font-medium">To:</span>
                    <br />
                    <span className="text-muted-foreground">{paymentData.rideDetails?.dropoffLocation}</span>
                  </div>
                  <div>
                    <span className="font-medium">Driver:</span>
                    <br />
                    <span className="text-muted-foreground">{paymentData.rideDetails?.driverName}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="font-medium">Total Amount:</span>
                    <span className="text-2xl font-bold">${paymentData.amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <h3 className="font-semibold mb-3">Payment Information</h3>
                <PaymentProcessor 
                  amount={paymentData.amount}
                  currency="USD"
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  onCancel={handlePaymentCancel}
                />
              </div>
            </div>
          ) : null}
        </CardContent>

        <CardFooter className="flex flex-col text-sm text-muted-foreground">
          <p>Your payment information is securely processed by Stripe.</p>
          <p>You will receive a confirmation once your payment is complete.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
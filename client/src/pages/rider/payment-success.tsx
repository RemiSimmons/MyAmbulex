import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { CheckCircle, Home, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

export default function PaymentSuccessPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [, params] = useRoute<{ rideId?: string }>('/rider/payment-success/:rideId?');
  const rideId = params?.rideId;

  useEffect(() => {
    // Show success toast
    toast({
      title: "Payment Successful!",
      description: "Your payment has been processed successfully.",
      variant: "default"
    });

    // Auto-redirect to dashboard after 5 seconds
    const timer = setTimeout(() => {
      setLocation('/rider/dashboard');
    }, 5000);

    return () => clearTimeout(timer);
  }, [toast, setLocation]);

  const handleGoToDashboard = () => {
    setLocation('/rider/dashboard');
  };

  const handleViewRide = () => {
    if (rideId) {
      setLocation(`/rider/ride/${rideId}`);
    } else {
      setLocation('/rider/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-700">
            Payment Successful!
          </CardTitle>
          <CardDescription className="text-lg">
            Your payment has been processed successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-gray-600">
            <p>Thank you for your payment. Your ride has been confirmed.</p>
            <p className="text-sm mt-2">
              You will be redirected to your dashboard in 5 seconds...
            </p>
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={handleGoToDashboard} 
              className="w-full"
              size="lg"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
            
            {rideId && (
              <Button 
                onClick={handleViewRide} 
                variant="outline" 
                className="w-full"
                size="lg"
              >
                <Calendar className="w-4 h-4 mr-2" />
                View Ride Details
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
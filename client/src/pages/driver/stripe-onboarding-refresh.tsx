import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

export default function StripeOnboardingRefresh() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Show refresh message
    toast({
      title: "Onboarding Incomplete",
      description: "Please complete your Stripe onboarding to receive payments.",
      variant: "destructive",
    });
  }, [toast]);

  const handleRetry = () => {
    setLocation('/driver/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <RefreshCw className="h-16 w-16 text-orange-500" />
          </div>
          <CardTitle className="text-2xl text-orange-700">
            Complete Your Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-gray-600">
            <p className="mb-4">
              Your Stripe Connect onboarding needs to be completed before you can receive payments.
            </p>
            <p className="text-sm">
              Don't worry - you can continue where you left off.
            </p>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <h4 className="font-medium text-orange-800 mb-2">What's Next:</h4>
            <ul className="text-sm text-orange-700 space-y-1">
              <li>• Return to your dashboard</li>
              <li>• Click "Complete Onboarding" again</li>
              <li>• Finish the Stripe setup process</li>
            </ul>
          </div>

          <Button 
            onClick={handleRetry}
            className="w-full"
            size="lg"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
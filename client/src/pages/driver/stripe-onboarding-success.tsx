import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

export default function StripeOnboardingSuccess() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Show success message
    toast({
      title: "Onboarding Complete!",
      description: "Your Stripe Connect account has been successfully set up.",
    });
  }, [toast]);

  const handleContinue = () => {
    setLocation('/driver/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-green-700">
            Payment Setup Complete!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-gray-600">
            <p className="mb-4">
              Your Stripe Connect account has been successfully configured.
            </p>
            <p className="text-sm">
              You can now receive payments from riders directly to your bank account.
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">Next Steps:</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Start accepting ride requests</li>
              <li>• Monitor your earnings in the dashboard</li>
              <li>• Set up automatic payouts if desired</li>
            </ul>
          </div>

          <Button 
            onClick={handleContinue}
            className="w-full"
            size="lg"
          >
            Continue to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
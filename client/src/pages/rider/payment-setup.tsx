import React from 'react';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { PaymentSetup } from '@/components/payment-setup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function PaymentSetupPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isComplete, setIsComplete] = useState(false);

  if (!user || user.role !== 'rider') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <p>Access denied. This page is only available to riders.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleComplete = () => {
    setIsComplete(true);
    // Redirect back to previous page or ride requests
    setTimeout(() => {
      setLocation('/dashboard');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900">Payment Setup</h1>
          <p className="text-gray-600 mt-2">
            Add a payment method for seamless ride bookings. Your card will only be charged when you accept a ride.
          </p>
        </div>

        {isComplete ? (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-green-600 text-4xl mb-4">✓</div>
              <h2 className="text-xl font-semibold mb-2">Payment Method Added!</h2>
              <p className="text-gray-600 mb-4">
                You can now accept ride bids with automatic payment processing.
              </p>
              <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
            </CardContent>
          </Card>
        ) : (
          <PaymentSetup onComplete={handleComplete} />
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, CreditCard, Plus } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

export function PaymentMethodSetup() {
  const [isSetupActive, setIsSetupActive] = useState(false);
  const { toast } = useToast();

  // Get setup intent
  const setupIntentMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/payment/setup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to create setup intent');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Here you would integrate with Stripe Elements to collect payment method
      // For now, we'll show success
      toast({
        title: 'Setup Intent Created',
        description: 'Ready to add payment method.',
      });
      setIsSetupActive(true);
    },
    onError: (error) => {
      toast({
        title: 'Setup Failed',
        description: 'Failed to initialize payment method setup.',
        variant: 'destructive',
      });
    }
  });

  const handleSetupPaymentMethod = () => {
    setupIntentMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Methods
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Alert>
            <AlertDescription>
              Add a payment method to easily pay for rides. Your payment information is securely stored and processed by Stripe.
            </AlertDescription>
          </Alert>
          
          <Button 
            onClick={handleSetupPaymentMethod}
            disabled={setupIntentMutation.isPending || isSetupActive}
            className="w-full"
          >
            {setupIntentMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add Payment Method
              </>
            )}
          </Button>
          
          {isSetupActive && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                Payment method setup interface would appear here with Stripe Elements.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

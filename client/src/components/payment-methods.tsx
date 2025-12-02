import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CreditCard, Plus, Trash2, Star, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface PaymentMethod {
  id: number;
  type: string;
  provider: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  holderName: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

function AddPaymentMethodForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [setAsDefault, setSetAsDefault] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Create payment method
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Add to our system
      const response = await apiRequest('POST', '/api/payment-methods', {
        stripePaymentMethodId: paymentMethod.id,
        setAsDefault
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add payment method');
      }

      toast({
        title: "Payment Method Added",
        description: "Your payment method has been successfully added.",
      });

      onSuccess();
    } catch (error) {
      console.error('Error adding payment method:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add payment method",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
            },
          }}
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="setAsDefault"
          checked={setAsDefault}
          onChange={(e) => setSetAsDefault(e.target.checked)}
        />
        <label htmlFor="setAsDefault" className="text-sm">
          Set as default payment method
        </label>
      </div>

      <Button type="submit" disabled={!stripe || loading} className="w-full">
        {loading ? 'Adding...' : 'Add Payment Method'}
      </Button>
    </form>
  );
}

export function PaymentMethods() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: paymentMethods = [], isLoading } = useQuery({
    queryKey: ['/api/payment-methods'],
    queryFn: () => apiRequest('GET', '/api/payment-methods').then(res => res.json()),
  });

  const removePaymentMethod = useMutation({
    mutationFn: (paymentMethodId: number) => 
      apiRequest('DELETE', `/api/payment-methods/${paymentMethodId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
      toast({
        title: "Payment Method Removed",
        description: "The payment method has been successfully removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove payment method",
        variant: "destructive",
      });
    }
  });

  const setDefaultPaymentMethod = useMutation({
    mutationFn: (paymentMethodId: number) => 
      apiRequest('POST', `/api/payment-methods/${paymentMethodId}/set-default`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
      toast({
        title: "Default Updated",
        description: "Default payment method has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update default payment method",
        variant: "destructive",
      });
    }
  });

  const handleAddSuccess = () => {
    setShowAddDialog(false);
    queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
  };

  const getBrandIcon = (brand: string) => {
    return <CreditCard className="h-4 w-4" />;
  };

  if (isLoading) {
    return <div className="animate-pulse">Loading payment methods...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Payment Methods</h2>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Payment Method
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Payment Method</DialogTitle>
            </DialogHeader>
            <Elements stripe={stripePromise}>
              <AddPaymentMethodForm onSuccess={handleAddSuccess} />
            </Elements>
          </DialogContent>
        </Dialog>
      </div>

      {paymentMethods.length === 0 ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No payment methods found. Add a payment method to book rides.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4">
          {paymentMethods.map((method: PaymentMethod) => (
            <Card key={method.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getBrandIcon(method.brand)}
                    <div>
                      <CardTitle className="text-lg capitalize">
                        {method.brand} •••• {method.last4}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Expires {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}
                      </p>
                      {method.holderName && (
                        <p className="text-sm text-muted-foreground">{method.holderName}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {method.isDefault && (
                      <Badge variant="default">
                        <Star className="h-3 w-3 mr-1" />
                        Default
                      </Badge>
                    )}
                    <Badge variant="outline" className="capitalize">
                      {method.provider}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Added {new Date(method.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center space-x-2">
                    {!method.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDefaultPaymentMethod.mutate(method.id)}
                        disabled={setDefaultPaymentMethod.isPending}
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removePaymentMethod.mutate(method.id)}
                      disabled={removePaymentMethod.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default PaymentMethods;
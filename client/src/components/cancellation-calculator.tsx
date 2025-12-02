import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Calculator, Clock, DollarSign, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface CancellationCalculation {
  canCancel: boolean;
  refundAmount: number;
  refundPercentage: number;
  cancellationFee: number;
  reason: string;
  policy: {
    name: string;
    freeCancel: number;
    partialRefund: number;
    noRefund: number;
    partialRefundPercentage: number;
  } | null;
}

interface CancellationCalculatorProps {
  rideId: number;
  rideAmount: number;
  pickupTime: string;
  userRole: 'rider' | 'driver' | 'admin';
  onCancel?: (refundAmount: number) => void;
}

export function CancellationCalculator({ 
  rideId, 
  rideAmount, 
  pickupTime, 
  userRole,
  onCancel 
}: CancellationCalculatorProps) {
  const { toast } = useToast();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const { data: calculation, isLoading, refetch } = useQuery({
    queryKey: ['/api/cancellation/calculate', rideId],
    queryFn: () => apiRequest('POST', '/api/cancellation/calculate', {
      rideId,
      requestedBy: userRole
    }).then(res => res.json()),
  });

  const hoursUntilPickup = Math.max(0, 
    (new Date(pickupTime).getTime() - new Date().getTime()) / (1000 * 60 * 60)
  );

  const handleCancelRide = async () => {
    if (!calculation?.canCancel) return;

    setProcessing(true);
    try {
      const response = await apiRequest('POST', `/api/rides/${rideId}/cancel`, {
        reason: cancellationReason || 'Rider cancellation',
        requestedBy: userRole
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel ride');
      }

      const result = await response.json();

      toast({
        title: "Ride Cancelled",
        description: `Ride cancelled successfully. ${
          calculation.refundAmount > 0 
            ? `Refund of $${calculation.refundAmount.toFixed(2)} will be processed.`
            : 'No refund applicable.'
        }`,
      });

      setShowConfirmDialog(false);
      onCancel?.(calculation.refundAmount);

    } catch (error) {
      console.error('Error cancelling ride:', error);
      toast({
        title: "Cancellation Failed",
        description: error instanceof Error ? error.message : "Failed to cancel ride",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getPolicyColor = (refundPercentage: number) => {
    if (refundPercentage === 100) return 'text-green-600';
    if (refundPercentage > 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return <div className="animate-pulse">Calculating cancellation policy...</div>;
  }

  if (!calculation) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Unable to calculate cancellation policy. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5" />
            <span>Cancellation Calculator</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Time Until Pickup</span>
              </div>
              <p className="text-lg font-mono">
                {hoursUntilPickup.toFixed(1)} hours
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Ride Amount</span>
              </div>
              <p className="text-lg font-mono">
                ${rideAmount.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Cancellation Analysis</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-sm font-medium">Refund Amount</span>
                <p className={`text-2xl font-bold ${getPolicyColor(calculation.refundPercentage)}`}>
                  ${calculation.refundAmount.toFixed(2)}
                </p>
                <Badge variant={
                  calculation.refundPercentage === 100 ? 'default' :
                  calculation.refundPercentage > 0 ? 'secondary' : 'destructive'
                }>
                  {calculation.refundPercentage}% refund
                </Badge>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium">Cancellation Fee</span>
                <p className="text-2xl font-bold text-red-600">
                  ${calculation.cancellationFee.toFixed(2)}
                </p>
                <Badge variant="outline">
                  {((calculation.cancellationFee / rideAmount) * 100).toFixed(0)}% fee
                </Badge>
              </div>
            </div>

            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{calculation.reason}</p>
            </div>
          </div>

          {calculation.policy && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Policy Details - {calculation.policy.name}</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Free Cancellation</span>
                  <p>{calculation.policy.freeCancel}+ hours before</p>
                </div>
                <div>
                  <span className="font-medium">Partial Refund</span>
                  <p>{calculation.policy.partialRefund}+ hours before ({calculation.policy.partialRefundPercentage}%)</p>
                </div>
                <div>
                  <span className="font-medium">No Refund</span>
                  <p>Less than {calculation.policy.noRefund} hours</p>
                </div>
              </div>
            </div>
          )}

          {calculation.canCancel && (
            <div className="border-t pt-4">
              <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Cancel Ride
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Ride Cancellation</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        You will receive a refund of ${calculation.refundAmount.toFixed(2)} 
                        {calculation.cancellationFee > 0 && (
                          <span> and be charged a cancellation fee of ${calculation.cancellationFee.toFixed(2)}</span>
                        )}.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label htmlFor="reason">Cancellation Reason (Optional)</Label>
                      <Textarea
                        id="reason"
                        placeholder="Please provide a reason for cancellation..."
                        value={cancellationReason}
                        onChange={(e) => setCancellationReason(e.target.value)}
                      />
                    </div>

                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowConfirmDialog(false)}
                        disabled={processing}
                      >
                        Keep Ride
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={handleCancelRide}
                        disabled={processing}
                      >
                        {processing ? 'Cancelling...' : 'Confirm Cancellation'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {!calculation.canCancel && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {calculation.reason}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default CancellationCalculator;
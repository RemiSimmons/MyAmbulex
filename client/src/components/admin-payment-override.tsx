import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, CreditCard, RefreshCw, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface AdminPaymentOverrideProps {
  userId?: number;
  rideId?: number;
  onSuccess?: () => void;
}

export function AdminPaymentOverride({ userId, rideId, onSuccess }: AdminPaymentOverrideProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Override Charge State
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeReason, setChargeReason] = useState('');
  const [chargeUserId, setChargeUserId] = useState(userId?.toString() || '');
  const [chargeRideId, setChargeRideId] = useState(rideId?.toString() || '');
  
  // Credit State
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [creditUserId, setCreditUserId] = useState(userId?.toString() || '');
  const [creditRideId, setCreditRideId] = useState(rideId?.toString() || '');
  
  // Refund State
  const [refundTransactionId, setRefundTransactionId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const overrideCharge = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/admin/payments/override-charge', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payment-history'] });
      toast({
        title: "Override Charge Processed",
        description: "The admin override charge has been successfully processed.",
      });
      setChargeAmount('');
      setChargeReason('');
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to process override charge",
        variant: "destructive",
      });
    }
  });

  const processCredit = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/admin/payments/credit', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payment-history'] });
      toast({
        title: "Credit Processed",
        description: "The admin credit has been successfully processed.",
      });
      setCreditAmount('');
      setCreditReason('');
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to process credit",
        variant: "destructive",
      });
    }
  });

  const forceRefund = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/admin/payments/force-refund', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payment-history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/refund-history'] });
      toast({
        title: "Refund Processed",
        description: "The admin force refund has been successfully processed.",
      });
      setRefundTransactionId('');
      setRefundAmount('');
      setRefundReason('');
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to process refund",
        variant: "destructive",
      });
    }
  });

  const handleOverrideCharge = () => {
    if (!chargeAmount || !chargeReason || !chargeUserId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    overrideCharge.mutate({
      userId: parseInt(chargeUserId),
      amount: parseFloat(chargeAmount),
      reason: chargeReason,
      rideId: chargeRideId ? parseInt(chargeRideId) : undefined
    });
  };

  const handleCredit = () => {
    if (!creditAmount || !creditReason || !creditUserId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    processCredit.mutate({
      userId: parseInt(creditUserId),
      amount: parseFloat(creditAmount),
      reason: creditReason,
      rideId: creditRideId ? parseInt(creditRideId) : undefined
    });
  };

  const handleForceRefund = () => {
    if (!refundTransactionId || !refundAmount || !refundReason) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    forceRefund.mutate({
      transactionId: refundTransactionId,
      amount: parseFloat(refundAmount),
      reason: refundReason
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <span>Admin Payment Override</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            These actions will bypass normal payment processing and create immediate transactions. 
            Use with extreme caution and document all actions thoroughly.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="charge" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="charge">Override Charge</TabsTrigger>
            <TabsTrigger value="credit">Credit Account</TabsTrigger>
            <TabsTrigger value="refund">Force Refund</TabsTrigger>
          </TabsList>

          <TabsContent value="charge" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="charge-user-id">User ID *</Label>
                <Input
                  id="charge-user-id"
                  type="number"
                  placeholder="Enter user ID"
                  value={chargeUserId}
                  onChange={(e) => setChargeUserId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="charge-ride-id">Ride ID (Optional)</Label>
                <Input
                  id="charge-ride-id"
                  type="number"
                  placeholder="Enter ride ID"
                  value={chargeRideId}
                  onChange={(e) => setChargeRideId(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="charge-amount">Amount (USD) *</Label>
              <Input
                id="charge-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={chargeAmount}
                onChange={(e) => setChargeAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="charge-reason">Reason *</Label>
              <Textarea
                id="charge-reason"
                placeholder="Explain the reason for this override charge..."
                value={chargeReason}
                onChange={(e) => setChargeReason(e.target.value)}
              />
            </div>

            <Button 
              onClick={handleOverrideCharge}
              disabled={overrideCharge.isPending}
              className="w-full"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              {overrideCharge.isPending ? 'Processing...' : 'Apply Override Charge'}
            </Button>
          </TabsContent>

          <TabsContent value="credit" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="credit-user-id">User ID *</Label>
                <Input
                  id="credit-user-id"
                  type="number"
                  placeholder="Enter user ID"
                  value={creditUserId}
                  onChange={(e) => setCreditUserId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credit-ride-id">Ride ID (Optional)</Label>
                <Input
                  id="credit-ride-id"
                  type="number"
                  placeholder="Enter ride ID"
                  value={creditRideId}
                  onChange={(e) => setCreditRideId(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="credit-amount">Credit Amount (USD) *</Label>
              <Input
                id="credit-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="credit-reason">Reason *</Label>
              <Textarea
                id="credit-reason"
                placeholder="Explain the reason for this credit..."
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
              />
            </div>

            <Button 
              onClick={handleCredit}
              disabled={processCredit.isPending}
              className="w-full"
              variant="secondary"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {processCredit.isPending ? 'Processing...' : 'Apply Credit'}
            </Button>
          </TabsContent>

          <TabsContent value="refund" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="refund-transaction-id">Transaction ID *</Label>
              <Input
                id="refund-transaction-id"
                placeholder="Enter transaction ID to refund"
                value={refundTransactionId}
                onChange={(e) => setRefundTransactionId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund-amount">Refund Amount (USD) *</Label>
              <Input
                id="refund-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund-reason">Reason *</Label>
              <Select value={refundReason} onValueChange={setRefundReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select refund reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin_override">Admin Override</SelectItem>
                  <SelectItem value="duplicate">Duplicate Payment</SelectItem>
                  <SelectItem value="fraudulent">Fraudulent Transaction</SelectItem>
                  <SelectItem value="service_issue">Service Issue</SelectItem>
                  <SelectItem value="customer_dispute">Customer Dispute</SelectItem>
                  <SelectItem value="technical_error">Technical Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleForceRefund}
              disabled={forceRefund.isPending}
              className="w-full"
              variant="destructive"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {forceRefund.isPending ? 'Processing...' : 'Force Refund'}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default AdminPaymentOverride;
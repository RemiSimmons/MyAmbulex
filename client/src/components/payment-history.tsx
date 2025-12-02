import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { ArrowUpDown, Eye, Receipt, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface PaymentTransaction {
  id: number;
  transactionId: string;
  rideId?: number;
  amount: number;
  currency: string;
  type: string;
  status: string;
  provider: string;
  platformFee?: number;
  processingFee?: number;
  netAmount?: number;
  adminOverride: boolean;
  adminNotes?: string;
  createdAt: string;
  metadata?: any;
}

interface Refund {
  id: number;
  refundId: string;
  amount: number;
  currency: string;
  reason: string;
  status: string;
  type: string;
  initiatedBy: string;
  adminNotes?: string;
  createdAt: string;
}

function TransactionDetails({ transaction }: { transaction: PaymentTransaction }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Transaction ID</label>
          <p className="text-sm text-muted-foreground">{transaction.transactionId}</p>
        </div>
        <div>
          <label className="text-sm font-medium">Status</label>
          <Badge 
            variant={
              transaction.status === 'succeeded' ? 'default' :
              transaction.status === 'failed' ? 'destructive' :
              'secondary'
            }
          >
            {transaction.status}
          </Badge>
        </div>
        <div>
          <label className="text-sm font-medium">Amount</label>
          <p className="text-sm font-mono">${transaction.amount.toFixed(2)} {transaction.currency}</p>
        </div>
        <div>
          <label className="text-sm font-medium">Provider</label>
          <p className="text-sm capitalize">{transaction.provider}</p>
        </div>
        {transaction.platformFee && (
          <div>
            <label className="text-sm font-medium">Platform Fee</label>
            <p className="text-sm font-mono">${transaction.platformFee.toFixed(2)}</p>
          </div>
        )}
        {transaction.processingFee && (
          <div>
            <label className="text-sm font-medium">Processing Fee</label>
            <p className="text-sm font-mono">${transaction.processingFee.toFixed(2)}</p>
          </div>
        )}
        {transaction.netAmount && (
          <div>
            <label className="text-sm font-medium">Net Amount</label>
            <p className="text-sm font-mono">${transaction.netAmount.toFixed(2)}</p>
          </div>
        )}
        <div>
          <label className="text-sm font-medium">Date</label>
          <p className="text-sm">{new Date(transaction.createdAt).toLocaleString()}</p>
        </div>
      </div>

      {transaction.adminOverride && (
        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-center space-x-2">
            <Badge variant="outline">Admin Override</Badge>
          </div>
          {transaction.adminNotes && (
            <p className="text-sm mt-2">{transaction.adminNotes}</p>
          )}
        </div>
      )}

      {transaction.rideId && (
        <div>
          <label className="text-sm font-medium">Related Ride</label>
          <p className="text-sm text-muted-foreground">Ride #{transaction.rideId}</p>
        </div>
      )}
    </div>
  );
}

export function PaymentHistory() {
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentTransaction | null>(null);
  const [activeTab, setActiveTab] = useState<'transactions' | 'refunds'>('transactions');

  const { data: transactions = [], isLoading: loadingTransactions } = useQuery({
    queryKey: ['/api/payment-history'],
    queryFn: () => apiRequest('GET', '/api/payment-history').then(res => res.json()),
  });

  const { data: refunds = [], isLoading: loadingRefunds } = useQuery({
    queryKey: ['/api/refund-history'],
    queryFn: () => apiRequest('GET', '/api/refund-history').then(res => res.json()),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded': return 'default';
      case 'failed': return 'destructive';
      case 'pending': return 'secondary';
      case 'refunded': return 'outline';
      default: return 'secondary';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'refund': return <RefreshCw className="h-4 w-4" />;
      default: return <Receipt className="h-4 w-4" />;
    }
  };

  if (loadingTransactions || loadingRefunds) {
    return <div className="animate-pulse">Loading payment history...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Payment History</h2>
        <div className="flex space-x-2">
          <Button
            variant={activeTab === 'transactions' ? 'default' : 'outline'}
            onClick={() => setActiveTab('transactions')}
          >
            Transactions
          </Button>
          <Button
            variant={activeTab === 'refunds' ? 'default' : 'outline'}
            onClick={() => setActiveTab('refunds')}
          >
            Refunds
          </Button>
        </div>
      </div>

      {activeTab === 'transactions' && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No payment transactions found
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction: PaymentTransaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {transaction.transactionId.slice(0, 12)}...
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(transaction.type)}
                          <span className="capitalize">{transaction.type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">
                        ${transaction.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(transaction.status)}>
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">
                        {transaction.provider}
                        {transaction.adminOverride && (
                          <Badge variant="outline" className="ml-2">Override</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Transaction Details</DialogTitle>
                            </DialogHeader>
                            <TransactionDetails transaction={transaction} />
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'refunds' && (
        <Card>
          <CardHeader>
            <CardTitle>Refund History</CardTitle>
          </CardHeader>
          <CardContent>
            {refunds.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No refunds found
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Refund ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Initiated By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refunds.map((refund: Refund) => (
                    <TableRow key={refund.id}>
                      <TableCell>
                        {new Date(refund.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {refund.refundId.slice(0, 12)}...
                      </TableCell>
                      <TableCell className="font-mono">
                        ${refund.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="capitalize">
                        {refund.type}
                      </TableCell>
                      <TableCell className="capitalize">
                        {refund.reason.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(refund.status)}>
                          {refund.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">
                        {refund.initiatedBy}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default PaymentHistory;
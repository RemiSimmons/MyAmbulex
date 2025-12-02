import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Clock, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/header";

interface DriverPayout {
  id: number;
  rideId: number;
  amount: number;
  platformFee: number;
  driverAmount: number;
  processingFee: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  stripeTransferId?: string;
  failureReason?: string;
}

interface PayoutSummary {
  totalEarnings: number;
  totalPayouts: number;
  completedPayouts: number;
  pendingPayouts: number;
  failedPayouts: number;
}

const statusIcons = {
  pending: Clock,
  processing: Clock,
  completed: CheckCircle,
  failed: XCircle
};

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800", 
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800"
};

export default function DriverPayouts() {
  const { data: payouts = [], isLoading: payoutsLoading } = useQuery<DriverPayout[]>({
    queryKey: ['/api/driver/payouts'],
    queryFn: async () => {
      const response = await fetch('/api/driver/payouts?limit=20');
      if (!response.ok) {
        throw new Error('Failed to fetch payouts');
      }
      return response.json();
    }
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<PayoutSummary>({
    queryKey: ['/api/driver/payouts/summary'],
    queryFn: async () => {
      const response = await fetch('/api/driver/payouts/summary');
      if (!response.ok) {
        throw new Error('Failed to fetch payout summary');
      }
      return response.json();
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Driver Earnings</h1>
          <p className="text-gray-600">Track your payouts and earnings history</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">Payout History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {summaryLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : summary ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(summary.totalEarnings)}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Payouts</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {summary.totalPayouts}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Completed</p>
                        <p className="text-2xl font-bold text-green-600">
                          {summary.completedPayouts}
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Pending</p>
                        <p className="text-2xl font-bold text-yellow-600">
                          {summary.pendingPayouts}
                        </p>
                      </div>
                      <Clock className="h-8 w-8 text-yellow-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-gray-600">No payout data available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            {payoutsLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="flex items-center space-x-4">
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : payouts.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Payouts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {payouts.map((payout) => {
                      const StatusIcon = statusIcons[payout.status];
                      return (
                        <div key={payout.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <StatusIcon className="h-5 w-5 text-gray-500" />
                            <div>
                              <p className="font-medium">Ride #{payout.rideId}</p>
                              <p className="text-sm text-gray-600">
                                {formatDate(payout.createdAt)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="font-bold text-green-600">
                                {formatCurrency(payout.driverAmount)}
                              </p>
                              <p className="text-sm text-gray-500">
                                Total: {formatCurrency(payout.amount)}
                              </p>
                            </div>
                            
                            <Badge 
                              variant="secondary" 
                              className={statusColors[payout.status]}
                            >
                              {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                            </Badge>
                          </div>
                          
                          {payout.failureReason && (
                            <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                              {payout.failureReason}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-gray-600">No payouts found</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Complete rides to start earning and receiving payouts
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
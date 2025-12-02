import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, History, Calculator, Settings } from 'lucide-react';
import PaymentMethods from '@/components/payment-methods';
import PaymentHistory from '@/components/payment-history';
import CancellationCalculator from '@/components/cancellation-calculator';
import AdminPaymentOverride from '@/components/admin-payment-override';
import { useUser } from '@/hooks/use-user';

export default function PaymentDashboard() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('methods');

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your payment methods, view transaction history, and handle cancellations
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          {user.role === 'admin' ? 'Administrator' : user.role === 'driver' ? 'Driver' : 'Rider'}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="methods" className="flex items-center space-x-2">
            <CreditCard className="h-4 w-4" />
            <span>Payment Methods</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <History className="h-4 w-4" />
            <span>Transaction History</span>
          </TabsTrigger>
          <TabsTrigger value="calculator" className="flex items-center space-x-2">
            <Calculator className="h-4 w-4" />
            <span>Cancellation Calculator</span>
          </TabsTrigger>
          {user.role === 'admin' && (
            <TabsTrigger value="admin" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Admin Controls</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="methods">
          <PaymentMethods />
        </TabsContent>

        <TabsContent value="history">
          <PaymentHistory />
        </TabsContent>

        <TabsContent value="calculator">
          <Card>
            <CardHeader>
              <CardTitle>Cancellation Calculator</CardTitle>
              <p className="text-sm text-muted-foreground">
                Calculate cancellation fees and refund amounts for ride cancellations
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  To use the cancellation calculator, you'll need to provide a specific ride ID. 
                  This tool is typically used from within a ride details page.
                </p>
                {/* This would typically be accessed from a ride details page with a specific ride ID */}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {user.role === 'admin' && (
          <TabsContent value="admin">
            <div className="space-y-6">
              <AdminPaymentOverride />
              
              <Card>
                <CardHeader>
                  <CardTitle>Admin Payment Tools</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Administrative tools for payment management and dispute resolution
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center space-x-2">
                          <CreditCard className="h-8 w-8 text-blue-500" />
                          <div>
                            <h3 className="font-semibold">Override Charges</h3>
                            <p className="text-sm text-muted-foreground">
                              Apply manual charges to user accounts
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center space-x-2">
                          <History className="h-8 w-8 text-green-500" />
                          <div>
                            <h3 className="font-semibold">Account Credits</h3>
                            <p className="text-sm text-muted-foreground">
                              Issue credits to user accounts
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center space-x-2">
                          <Calculator className="h-8 w-8 text-orange-500" />
                          <div>
                            <h3 className="font-semibold">Force Refunds</h3>
                            <p className="text-sm text-muted-foreground">
                              Process refunds outside normal flow
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
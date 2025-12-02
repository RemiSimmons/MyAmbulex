import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Loader2, CreditCard, ExternalLink, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { apiRequest } from '../../lib/queryClient';

interface AccountStatus {
  hasAccount: boolean;
  accountId?: string;
  isOnboarded: boolean;
  canReceivePayments: boolean;
  requirements: string[];
}

export function StripeConnectOnboarding() {
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Query account status
  const { data: accountStatus, isLoading: statusLoading, refetch } = useQuery({
    queryKey: ['/api/stripe-connect/account-status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/stripe-connect/account-status');
      return response.json() as Promise<AccountStatus>;
    },
    refetchInterval: 5000, // Check status every 5 seconds
  });

  // Create connected account mutation
  const createAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/stripe-connect/create-account');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Account Created",
        description: "Your Stripe Connect account has been created successfully.",
      });
      refetch(); // Refresh status
    },
    onError: (error) => {
      toast({
        title: "Account Creation Failed",
        description: "Failed to create your Stripe Connect account. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Create onboarding link mutation
  const onboardingLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/stripe-connect/onboarding-link');
      return response.json();
    },
    onSuccess: (data) => {
      setOnboardingUrl(data.onboardingUrl);
    },
    onError: (error) => {
      toast({
        title: "Onboarding Link Failed",
        description: "Failed to create onboarding link. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Create dashboard link mutation
  const dashboardLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/stripe-connect/dashboard-link');
      return response.json();
    },
    onSuccess: (data) => {
      window.open(data.dashboardUrl, '_blank');
    },
    onError: (error) => {
      toast({
        title: "Dashboard Access Failed",
        description: "Failed to access your dashboard. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleCreateAccount = () => {
    createAccountMutation.mutate();
  };

  const handleStartOnboarding = () => {
    onboardingLinkMutation.mutate();
  };

  const handleAccessDashboard = () => {
    dashboardLinkMutation.mutate();
  };

  const handleContinueOnboarding = () => {
    if (onboardingUrl) {
      window.location.href = onboardingUrl;
    }
  };

  const getStatusIcon = () => {
    if (statusLoading) return <Loader2 className="h-5 w-5 animate-spin" />;
    if (!accountStatus?.hasAccount) return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    if (!accountStatus?.isOnboarded) return <Clock className="h-5 w-5 text-blue-500" />;
    if (!accountStatus?.canReceivePayments) return <AlertCircle className="h-5 w-5 text-orange-500" />;
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };

  const getStatusText = () => {
    if (statusLoading) return "Checking status...";
    if (!accountStatus?.hasAccount) return "Not Set Up";
    if (!accountStatus?.isOnboarded) return "Onboarding Required";
    if (!accountStatus?.canReceivePayments) return "Pending Approval";
    return "Ready to Receive Payments";
  };

  const getStatusVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    if (statusLoading) return "outline";
    if (!accountStatus?.hasAccount) return "destructive";
    if (!accountStatus?.isOnboarded) return "secondary";
    if (!accountStatus?.canReceivePayments) return "outline";
    return "default";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Setup
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <Badge variant={getStatusVariant()}>
              {getStatusText()}
            </Badge>
          </div>

          {/* Status Description */}
          <Alert>
            <AlertDescription>
              {!accountStatus?.hasAccount && (
                "You need to set up a Stripe Connect account to receive payments from riders."
              )}
              {accountStatus?.hasAccount && !accountStatus?.isOnboarded && (
                "Complete your Stripe onboarding to start receiving payments."
              )}
              {accountStatus?.isOnboarded && !accountStatus?.canReceivePayments && (
                "Your account is under review. You'll be able to receive payments once approved."
              )}
              {accountStatus?.canReceivePayments && (
                "Your payment account is ready! You can receive payments from riders."
              )}
            </AlertDescription>
          </Alert>

          {/* Requirements */}
          {accountStatus?.requirements && accountStatus.requirements.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Additional requirements:</strong>
                <ul className="mt-1 list-disc list-inside text-sm">
                  {accountStatus.requirements.map((req, index) => (
                    <li key={index}>{req.replace(/_/g, ' ')}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            {!accountStatus?.hasAccount && (
              <Button 
                onClick={handleCreateAccount}
                disabled={createAccountMutation.isPending}
                className="w-full"
              >
                {createAccountMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Create Payment Account
                  </>
                )}
              </Button>
            )}

            {accountStatus?.hasAccount && !accountStatus?.isOnboarded && (
              <Button 
                onClick={handleStartOnboarding}
                disabled={onboardingLinkMutation.isPending}
                className="w-full"
              >
                {onboardingLinkMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Preparing Onboarding...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Complete Onboarding
                  </>
                )}
              </Button>
            )}

            {onboardingUrl && (
              <Button 
                onClick={handleContinueOnboarding}
                className="w-full"
                variant="outline"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Continue to Stripe
              </Button>
            )}

            {accountStatus?.isOnboarded && (
              <Button 
                onClick={handleAccessDashboard}
                disabled={dashboardLinkMutation.isPending}
                className="w-full"
                variant="outline"
              >
                {dashboardLinkMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening Dashboard...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Access Payment Dashboard
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Help Text */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Your payment information is securely processed by Stripe</p>
            <p>• You'll receive payments directly to your bank account</p>
            <p>• Platform fees are automatically deducted</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
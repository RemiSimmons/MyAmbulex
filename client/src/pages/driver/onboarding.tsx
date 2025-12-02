import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import OnboardingSteps from './onboarding-steps';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Check, AlertCircle } from 'lucide-react';

export default function DriverOnboarding() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  // Check if the user is authenticated
  useEffect(() => {
    if (user === null) {
      navigate('/auth');
    } else if (user?.role !== 'driver') {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch driver status
  const { data: driverStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['/api/driver/status'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/driver/status');
        if (!res.ok) {
          throw new Error('Failed to fetch driver status');
        }
        return await res.json();
      } catch (error) {
        console.error('Error fetching driver status:', error);
        return { status: 'error', applicationStatus: null };
      }
    },
    enabled: !!user && user.role === 'driver',
  });

  // Fetch driver details for document verification status
  const { data: driverDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['/api/driver/details'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/driver/details');
        if (!res.ok) {
          if (res.status === 404) {
            return null; // No driver details yet
          }
          throw new Error('Failed to fetch driver details');
        }
        return await res.json();
      } catch (error) {
        console.error('Error fetching driver details:', error);
        return null;
      }
    },
    enabled: !!user && user.role === 'driver',
  });

  // Redirect approved drivers to dashboard instead of showing onboarding
  useEffect(() => {
    if (driverStatus?.isVerified && !isLoadingStatus) {
      navigate('/driver/dashboard');
    }
  }, [driverStatus?.isVerified, isLoadingStatus, navigate]);

  const handleOnboardingComplete = () => {
    setOnboardingComplete(true);
  };

  // Show loading state while checking auth and driver status
  if (!user || isLoadingStatus || isLoadingDetails) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If onboarding was just completed
  if (onboardingComplete) {
    return (
      <div className="container max-w-4xl mx-auto py-10 px-4">
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/10">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <div className="bg-green-100 p-2 rounded-full">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Application Submitted Successfully</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Thank you for submitting your driver application! Our team will review your information and documents. 
              You'll be notified about the status of your application within 1-3 business days.
            </p>
            <div className="flex space-x-4 pt-4">
              <Button onClick={() => navigate('/driver/dashboard')}>
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If driver status is already determined
  if (driverStatus?.applicationStatus && driverStatus.applicationStatus !== null) {
    const { applicationStatus } = driverStatus;
    
    let statusCard;
    
    switch (applicationStatus) {
      case 'active':
        statusCard = (
          <Card className="border-green-200 bg-green-50 dark:bg-green-900/10">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className="bg-green-100 p-2 rounded-full">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Application Approved</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Congratulations! Your driver application has been approved. You can now start accepting rides 
                and providing transportation services through our platform.
              </p>
              <div className="flex space-x-4 pt-4">
                <Button onClick={() => navigate('/driver/dashboard')}>
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        );
        break;
        
      case 'pending':
        statusCard = (
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className="bg-yellow-100 p-2 rounded-full">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <CardTitle>Application Under Review</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Your driver application is currently under review by our team. This process typically takes 
                1-3 business days. You'll be notified once a decision has been made.
              </p>
              <div className="flex space-x-4 pt-4">
                <Button variant="outline" onClick={() => navigate('/driver/dashboard')}>
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        );
        break;
        
      case 'rejected':
        statusCard = (
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/10">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className="bg-red-100 p-2 rounded-full">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <CardTitle>Application Rejected</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Unfortunately, your driver application has been rejected. This could be due to issues with the documents
                provided or not meeting our platform's requirements.
              </p>
              {driverStatus.rejectionReason && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-md border">
                  <h4 className="text-sm font-medium mb-1">Reason for rejection:</h4>
                  <p className="text-sm">{driverStatus.rejectionReason}</p>
                </div>
              )}
              <div className="flex space-x-4 pt-4">
                <Button variant="destructive" onClick={() => navigate('/driver/dashboard')}>
                  Go to Dashboard
                </Button>
                <Button variant="outline" onClick={() => navigate('/driver/reapply')}>
                  Reapply
                </Button>
              </div>
            </CardContent>
          </Card>
        );
        break;
        
      default:
        statusCard = (
          <Card>
            <CardHeader>
              <CardTitle>Unknown Application Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                We could not determine the status of your application. Please contact customer support for assistance.
              </p>
              <div className="flex space-x-4 pt-4">
                <Button variant="outline" onClick={() => navigate('/driver/dashboard')}>
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        );
    }
    
    return (
      <div className="container max-w-4xl mx-auto py-10 px-4">
        {statusCard}
      </div>
    );
  }

  // If user needs to complete onboarding
  return (
    <div className="container max-w-4xl mx-auto py-10 px-4">
      <Card className="mb-8">
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl">Driver Onboarding</CardTitle>
          <CardDescription>
            Complete the following steps to become a driver on our platform.
          </CardDescription>
        </CardHeader>
      </Card>


      <OnboardingSteps onComplete={handleOnboardingComplete} />
    </div>
  );
}
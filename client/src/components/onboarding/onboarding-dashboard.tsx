import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CircleCheck, Award, Star, Clock, BookOpen, Users, MapPin } from 'lucide-react';
import { Link } from 'wouter';

interface OnboardingProgress {
  userId: number;
  currentStep: string;
  onboardingCompleted: boolean;
  profileCompletionPercentage: number;
  isFirstRide: boolean;
  completedTours: string[];
  completedSteps: string[];
  lastUpdated: Date;
}

const OnboardingDashboard: React.FC = () => {
  const { user } = useAuth();
  const [overallProgress, setOverallProgress] = useState(0);
  
  const { data: onboardingData, isLoading } = useQuery<OnboardingProgress>({
    queryKey: ['/api/rider/onboarding/progress'],
    enabled: !!user,
  });

  useEffect(() => {
    if (onboardingData) {
      // Calculate overall progress from various metrics
      const profileWeight = 0.4; // 40% of total
      const toursWeight = 0.2; // 20% of total
      const stepsWeight = 0.3; // 30% of total
      const firstRideWeight = 0.1; // 10% of total
      
      const profileScore = (onboardingData.profileCompletionPercentage || 0) / 100 * profileWeight;
      const toursScore = onboardingData.completedTours?.length ? 
        (onboardingData.completedTours.length / 3) * toursWeight : 0; // Assuming 3 tours total
      const stepsScore = onboardingData.completedSteps?.length ? 
        (onboardingData.completedSteps.length / 7) * stepsWeight : 0; // Assuming 7 steps in onboarding
      const firstRideScore = onboardingData.isFirstRide ? firstRideWeight : 0;
      
      setOverallProgress(Math.round((profileScore + toursScore + stepsScore + firstRideScore) * 100));
    }
  }, [onboardingData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl">Your Onboarding Progress</CardTitle>
          <CardDescription>
            Complete your onboarding journey to unlock all features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{overallProgress}% Complete</span>
              {overallProgress === 100 ? (
                <Badge className="bg-green-600">Completed</Badge>
              ) : (
                <Badge>{overallProgress < 50 ? 'Just Started' : 'In Progress'}</Badge>
              )}
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <CircleCheck className={`h-5 w-5 ${onboardingData?.profileCompletionPercentage === 100 ? 'text-green-500' : 'text-gray-300'}`} />
              <span>Complete Your Profile</span>
              <span className="ml-auto">
                {onboardingData?.profileCompletionPercentage || 0}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Award className={`h-5 w-5 ${onboardingData?.completedTours?.includes('platform-tour') ? 'text-green-500' : 'text-gray-300'}`} />
              <span>Platform Tour</span>
              <Badge variant={onboardingData?.completedTours?.includes('platform-tour') ? 'default' : 'outline'} className="ml-auto">
                {onboardingData?.completedTours?.includes('platform-tour') ? 'Completed' : 'Pending'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Star className={`h-5 w-5 ${onboardingData?.completedTours?.includes('features-tour') ? 'text-green-500' : 'text-gray-300'}`} />
              <span>Key Features Tour</span>
              <Badge variant={onboardingData?.completedTours?.includes('features-tour') ? 'default' : 'outline'} className="ml-auto">
                {onboardingData?.completedTours?.includes('features-tour') ? 'Completed' : 'Pending'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Clock className={`h-5 w-5 ${onboardingData?.isFirstRide ? 'text-green-500' : 'text-gray-300'}`} />
              <span>First Ride</span>
              <Badge variant={onboardingData?.isFirstRide ? 'default' : 'outline'} className="ml-auto">
                {onboardingData?.isFirstRide ? 'Completed' : 'Pending'}
              </Badge>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full">
            <Button asChild className="flex-1">
              <Link to="/rider/book-ride">
                Book a Ride
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link to="/help">
                Get Help
              </Link>
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Tabs for different sections */}
      <Tabs defaultValue="milestones">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
        </TabsList>
        
        {/* Milestones Section */}
        <TabsContent value="milestones" className="space-y-4">
          <h3 className="text-lg font-semibold">Your Onboarding Milestones</h3>
          <div className="grid gap-4">
            {/* Milestone Cards */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Complete Your Profile</CardTitle>
                  <Badge variant={onboardingData?.profileCompletionPercentage === 100 ? 'default' : 'outline'}>
                    {onboardingData?.profileCompletionPercentage === 100 ? 'Completed' : `${onboardingData?.profileCompletionPercentage || 0}%`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Add your medical information, emergency contacts, and preferences to help us serve you better.</p>
              </CardContent>
              <CardFooter>
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link to="/settings">
                    Update Profile
                  </Link>
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Book Your First Ride</CardTitle>
                  <Badge variant={onboardingData?.isFirstRide ? 'default' : 'outline'}>
                    {onboardingData?.isFirstRide ? 'Completed' : 'Pending'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Experience the convenience of MyAmbulex by booking your first medical transportation ride.</p>
              </CardContent>
              <CardFooter>
                <Button asChild size="sm" variant={onboardingData?.isFirstRide ? 'outline' : 'default'} className="w-full">
                  <Link to="/rider/book-ride">
                    {onboardingData?.isFirstRide ? 'View Ride History' : 'Book Your First Ride'}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Add Saved Locations</CardTitle>
                  <Badge variant="outline">Optional</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Save your frequently visited healthcare locations for faster booking in the future.</p>
              </CardContent>
              <CardFooter>
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link to="/rider/addresses/new">
                    Add Location
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        {/* Resources Section */}
        <TabsContent value="resources" className="space-y-4">
          <h3 className="text-lg font-semibold">Helpful Resources</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-start gap-4">
                  <BookOpen className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle className="text-lg">Rider's Guide</CardTitle>
                    <CardDescription>Essential information for medical transportation</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Learn about our services, booking process, and what to expect during your medical transportation.</p>
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="outline" className="w-full">
                  Read Guide
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-start gap-4">
                  <Users className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle className="text-lg">Support Center</CardTitle>
                    <CardDescription>Contact our dedicated support team</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Need help or have questions? Our support team is available 24/7 to assist you.</p>
              </CardContent>
              <CardFooter>
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link to="/help">
                    Get Support
                  </Link>
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-start gap-4">
                  <MapPin className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle className="text-lg">Service Areas</CardTitle>
                    <CardDescription>Where we operate</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">View the regions where MyAmbulex provides non-emergency medical transportation services.</p>
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="outline" className="w-full">
                  View Map
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-start gap-4">
                  <Award className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle className="text-lg">Video Tutorials</CardTitle>
                    <CardDescription>Visual guides to using MyAmbulex</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Watch step-by-step video tutorials on how to make the most of MyAmbulex features.</p>
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="outline" className="w-full">
                  Watch Videos
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        {/* Rewards Section */}
        <TabsContent value="rewards" className="space-y-4">
          <h3 className="text-lg font-semibold">Onboarding Rewards</h3>
          <p className="text-sm text-muted-foreground">Complete onboarding tasks to earn special rewards and benefits.</p>
          
          <div className="grid gap-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">First Ride Discount</CardTitle>
                  <Badge variant={onboardingData?.isFirstRide ? 'destructive' : 'outline'}>
                    {onboardingData?.isFirstRide ? 'Claimed' : 'Available'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Receive 15% off your first medical transportation ride with MyAmbulex.
                </p>
                <div className="mt-3 flex items-center text-sm">
                  <Award className="h-4 w-4 mr-1 text-yellow-500" />
                  <span>Unlocked after creating your account</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button disabled={onboardingData?.isFirstRide} size="sm" className="w-full">
                  {onboardingData?.isFirstRide ? 'Already Claimed' : 'Claim Reward'}
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Priority Service</CardTitle>
                  <Badge variant={overallProgress >= 50 ? (overallProgress === 100 ? 'default' : 'secondary') : 'outline'}>
                    {overallProgress === 100 ? 'Unlocked' : overallProgress >= 50 ? 'Partially Unlocked' : 'Locked'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Get priority matching with top-rated drivers and receive expedited support.
                </p>
                <div className="mt-3 flex items-center text-sm">
                  <Award className="h-4 w-4 mr-1 text-yellow-500" />
                  <span>50% unlocked at 50% onboarding, fully unlocked at 100%</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button disabled={overallProgress < 50} size="sm" className="w-full">
                  {overallProgress === 100 ? 'Active' : overallProgress >= 50 ? 'Partially Active' : 'Complete Onboarding'}
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Loyalty Program</CardTitle>
                  <Badge variant={overallProgress === 100 ? 'default' : 'outline'}>
                    {overallProgress === 100 ? 'Unlocked' : 'Locked'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Join our loyalty program to earn points for every ride and redeem them for discounts.
                </p>
                <div className="mt-3 flex items-center text-sm">
                  <Award className="h-4 w-4 mr-1 text-yellow-500" />
                  <span>Unlocked after completing 100% of onboarding</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button disabled={overallProgress < 100} size="sm" className="w-full">
                  {overallProgress === 100 ? 'Join Program' : 'Complete Onboarding'}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OnboardingDashboard;
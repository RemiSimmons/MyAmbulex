import React from 'react';
import { Helmet } from 'react-helmet';
import OnboardingDashboard from '@/components/onboarding/onboarding-dashboard';
import Container from '@/components/ui/container';

const RiderOnboardingDashboardPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>MyAmbulex | Onboarding Dashboard</title>
      </Helmet>
      <Container>
        <div className="py-8">
          <h1 className="text-3xl font-bold mb-6">Your Onboarding Dashboard</h1>
          <p className="text-muted-foreground mb-8">
            Welcome to MyAmbulex! Complete your onboarding journey to get the most out of our medical transportation services.
          </p>
          <OnboardingDashboard />
        </div>
      </Container>
    </>
  );
};

export default RiderOnboardingDashboardPage;
import React from 'react';
import Container from '@/components/ui/container';
import { Helmet } from 'react-helmet';
import { HelpCenter } from '@/components/onboarding/help-center';

const HelpCenterPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>MyAmbulex | Help Center</title>
      </Helmet>
      <Container>
        <HelpCenter />
      </Container>
    </>
  );
};

export default HelpCenterPage;
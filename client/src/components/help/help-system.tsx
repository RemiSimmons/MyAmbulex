import React, { useEffect } from 'react';
import { HelpGuide } from './help-guide';
import { useHelp } from '@/context/help-context';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';

/**
 * HelpSystem component that integrates with the help context
 * This should be placed at the root level of the application
 * Now only shows for non-authenticated users on the home page
 */
export const HelpSystem: React.FC = () => {
  const { isHelpOpen, currentHelpStep, closeHelp } = useHelp();
  const { user } = useAuth();
  const [location] = useLocation();
  
  // Only show help guide on home page for non-authenticated users
  const shouldShowHelp = !user && location === '/';
  
  // If user logs in or navigates away from home, close any open help guide
  useEffect(() => {
    if (!shouldShowHelp && isHelpOpen) {
      closeHelp();
    }
  }, [shouldShowHelp, isHelpOpen, closeHelp]);
  
  if (!shouldShowHelp) {
    return null;
  }
  
  return (
    <HelpGuide
      open={isHelpOpen}
      onOpenChange={(open) => {
        if (!open) closeHelp();
      }}
      initialStep={currentHelpStep}
    />
  );
};
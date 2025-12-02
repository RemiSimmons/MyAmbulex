import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useOnboarding } from '@/context/onboarding-context';

export const FeatureTooltips: React.FC = () => {
  const { user } = useAuth();
  const { dismissTooltip, dismissedTooltips, onboardingState } = useOnboarding();
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  
  // List of available tooltips
  const tooltips = [
    {
      id: 'booking',
      title: 'Booking Made Easy',
      description: 'Click here to request a new medical transportation ride.',
      position: 'bottom',
      targetElement: '[data-tooltip="booking"]',
      delay: 2000,
    },
    {
      id: 'profile',
      title: 'Complete Your Profile',
      description: 'Add your medical information and preferences for better service.',
      position: 'right',
      targetElement: '[data-tooltip="profile"]',
      delay: 5000,
    },
    {
      id: 'notifications',
      title: 'Stay Updated',
      description: 'Check your notifications for ride updates and important information.',
      position: 'left',
      targetElement: '[data-tooltip="notifications"]',
      delay: 8000,
    }
  ];
  
  // Show tooltips sequentially
  useEffect(() => {
    if (!user || !dismissedTooltips || onboardingState.hasSkippedOnboarding) return;
    
    const availableTooltips = tooltips.filter(tooltip => 
      !dismissedTooltips.includes(tooltip.id)
    );
    
    if (availableTooltips.length === 0) return;
    
    // Show the first undismissed tooltip
    const tooltipToShow = availableTooltips[0];
    const timer = setTimeout(() => {
      setActiveTooltip(tooltipToShow.id);
    }, tooltipToShow.delay);
    
    return () => clearTimeout(timer);
  }, [user, dismissedTooltips, onboardingState.hasSkippedOnboarding]);
  
  // Find the currently active tooltip
  const currentTooltip = tooltips.find(tooltip => tooltip.id === activeTooltip);
  
  // Handle dismiss
  const handleDismiss = (tooltipId: string) => {
    dismissTooltip(tooltipId);
    setActiveTooltip(null);
  };
  
  if (!currentTooltip || !user || onboardingState.hasSkippedOnboarding) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <div 
        className="absolute pointer-events-auto"
        style={{
          // This would be dynamically positioned in a real implementation
          top: '200px',
          left: '300px',
        }}
      >
        <Card className="w-64 shadow-lg border-primary/20">
          <CardContent className="pt-4">
            <h3 className="font-medium text-sm mb-1">{currentTooltip.title}</h3>
            <p className="text-xs text-muted-foreground">{currentTooltip.description}</p>
          </CardContent>
          <CardFooter className="flex justify-between py-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs"
              onClick={() => handleDismiss(currentTooltip.id)}
            >
              Dismiss
            </Button>
            <Button 
              size="sm" 
              className="text-xs"
              onClick={() => handleDismiss(currentTooltip.id)}
            >
              Got it
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
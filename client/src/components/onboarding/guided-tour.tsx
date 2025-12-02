import React from 'react';

/**
 * GuidedTour is now completely disabled per user request.
 * The guided tour should not appear for logged-in users.
 */
export interface TourStep {
  path: string;
  title: string;
  description: string;
  element?: string; 
  position: 'top' | 'right' | 'bottom' | 'left';
}

export const GuidedTour: React.FC = () => {
  // Disabled component that does nothing
  return null;
};
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Interface for notification preferences (used for both savedNotificationPreferences JSON field)
interface NotificationPrefs {
  hasSkippedOnboarding?: boolean;
  hasDisabledOnboarding?: boolean;
  seenFeatures?: string[];
  dismissedTooltips?: string[];
}

export type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
};

export type OnboardingState = {
  currentStepId: string | null;
  hasCompletedTour: boolean;
  hasCompletedFirstRide: boolean;
  hasCompletedProfile: boolean;
  hasSkippedOnboarding: boolean;
  hasDisabledOnboarding: boolean; // New property to permanently disable onboarding
  steps: OnboardingStep[];
  seenFeatures: string[];
  dismissedTooltips: string[];
  lastActiveAt: Date;
};

export type OnboardingContextType = {
  onboardingState: OnboardingState;
  setCurrentStepId: (stepId: string | null) => void;
  markStepCompleted: (stepId: string) => void;
  markFeatureSeen: (featureId: string) => void;
  dismissTooltip: (tooltipId: string) => void;
  resetOnboarding: () => void;
  skipOnboarding: () => void;
  disableOnboarding: () => void; // New method to permanently disable onboarding
  isLoading: boolean;
  saveProgress: () => Promise<void>;
  // Additional methods needed by components
  updateStep: (stepId: string) => void;
  completeTour: () => void;
  completeFirstRide: () => void;
  completeProfile: () => void;
  setCurrentStep: (stepId: string) => void;
  dismissedTooltips: string[];
};

const initialOnboardingState: OnboardingState = {
  currentStepId: null,
  hasCompletedTour: false,
  hasCompletedFirstRide: false,
  hasCompletedProfile: false,
  hasSkippedOnboarding: false,
  hasDisabledOnboarding: false,
  steps: [],
  seenFeatures: [],
  dismissedTooltips: [],
  lastActiveAt: new Date()
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [onboardingState, setOnboardingState] = useState<OnboardingState>(initialOnboardingState);
  const [isLoading, setIsLoading] = useState(true);

  // Define all possible onboarding steps
  const possibleSteps: OnboardingStep[] = [
    {
      id: 'profile-basic',
      title: 'Complete Basic Profile',
      description: 'Add your name, contact info, and profile photo',
      completed: false
    },
    {
      id: 'profile-medical',
      title: 'Add Medical Information',
      description: 'Enter relevant medical details for better service',
      completed: false
    },
    {
      id: 'payment-setup',
      title: 'Set Up Payment Method',
      description: 'Add a payment card for ride bookings',
      completed: false,
      checkCompleted: async (userId: number) => {
        try {
          const response = await fetch('/api/payment/has-payment-method', {
            method: 'GET',
            credentials: 'include'
          });
          return response.ok && (await response.json()).hasPaymentMethod;
        } catch {
          return false;
        }
      }
    },
    {
      id: 'saved-addresses',
      title: 'Save Frequent Locations',
      description: 'Add home and medical facilities you visit',
      completed: false
    },
    {
      id: 'platform-tour',
      title: 'Take Platform Tour',
      description: 'Learn about key features and navigation',
      completed: false
    },
    {
      id: 'notification-settings',
      title: 'Configure Notifications',
      description: 'Choose how you want to be notified',
      completed: false
    },
    {
      id: 'first-ride',
      title: 'Book First Ride',
      description: 'Request your first medical transportation',
      completed: false
    },
    {
      id: 'emergency-contact',
      title: 'Add Emergency Contact',
      description: 'Add someone we can contact if needed',
      completed: false
    }
  ];

  // Add role-specific steps
  const addRoleSpecificSteps = (role: string): OnboardingStep[] => {
    let roleSteps = [...possibleSteps];
    
    if (role === 'driver') {
      roleSteps = [
        ...roleSteps,
        {
          id: 'vehicle-details',
          title: 'Add Vehicle Details',
          description: 'Enter information about your vehicle',
          completed: false
        },
        {
          id: 'document-verification',
          title: 'Upload Required Documents',
          description: 'Submit license, insurance, and other certifications',
          completed: false
        },
        {
          id: 'background-check',
          title: 'Complete Background Check',
          description: 'Authorize and complete required screening',
          completed: false
        },
        {
          id: 'driver-training',
          title: 'Complete Driver Training',
          description: 'Complete all required training modules',
          completed: false
        },
        {
          id: 'availability-settings',
          title: 'Set Availability',
          description: 'Set your working hours and service area',
          completed: false
        }
      ];
    }
    
    return roleSteps;
  };

  // Load onboarding state from server
  useEffect(() => {
    const fetchOnboardingState = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const endpoint = user.role === 'driver' 
          ? '/api/drivers/onboarding-progress' 
          : '/api/rider/onboarding/progress';
          
        const response = await apiRequest('GET', endpoint);
        const data = await response.json();
        
        // Get role-specific steps
        const roleSteps = addRoleSpecificSteps(user.role);
        
        // Map server data to our state
        const updatedSteps = roleSteps.map(step => ({
          ...step,
          completed: data.completedSteps?.includes(step.id) || false
        }));

        // Parse the savedNotificationPreferences JSON field to extract hasDisabledOnboarding
        
        let savedNotificationPrefs: NotificationPrefs = {};
        try {
          // Handle both string and object formats from the API
          if (typeof data.savedNotificationPreferences === 'string') {
            savedNotificationPrefs = JSON.parse(data.savedNotificationPreferences || '{}') as NotificationPrefs;
          } else if (data.savedNotificationPreferences) {
            savedNotificationPrefs = data.savedNotificationPreferences as NotificationPrefs;
          }
        } catch (e) {
          console.error('Error parsing notification preferences:', e);
          savedNotificationPrefs = {};
        }
        
        // Check for hasDisabledOnboarding in multiple possible locations
        // First directly in the data object, then in the savedNotificationPreferences
        // Use strict equality check with true to ensure proper boolean value
        let hasDisabledOnboarding = false;
        
        // Check all possible locations where this flag might be stored
        if (data.hasDisabledOnboarding === true) {
          hasDisabledOnboarding = true;
        } else if (savedNotificationPrefs.hasDisabledOnboarding === true) {
          hasDisabledOnboarding = true;
        }
          
        console.log('Loaded onboarding state from server:', {
          currentStep: data.currentStep,
          hasDisabledOnboarding: hasDisabledOnboarding,
          dataHasDisabledOnboarding: data.hasDisabledOnboarding,
          prefsHasDisabledOnboarding: savedNotificationPrefs.hasDisabledOnboarding,
          savedNotificationPrefs,
          endpoint
        });
        
        setOnboardingState({
          currentStepId: data.currentStep || null,
          hasCompletedTour: data.hasCompletedTour || false,
          hasCompletedFirstRide: data.hasCompletedFirstRide || false,
          hasCompletedProfile: data.hasCompletedProfile || false,
          hasSkippedOnboarding: data.hasSkippedOnboarding || savedNotificationPrefs.hasSkippedOnboarding || false,
          hasDisabledOnboarding: hasDisabledOnboarding,
          steps: updatedSteps,
          seenFeatures: data.seenFeatures || (savedNotificationPrefs.seenFeatures || []),
          dismissedTooltips: data.dismissedTooltips || (savedNotificationPrefs.dismissedTooltips || []),
          lastActiveAt: new Date(data.lastActiveAt) || new Date()
        });
      } catch (error) {
        console.error('Failed to fetch onboarding state:', error);
        
        // Initialize with role-specific steps if we can't fetch from server
        if (user) {
          const roleSteps = addRoleSpecificSteps(user.role);
          setOnboardingState({
            ...initialOnboardingState,
            steps: roleSteps
          });
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOnboardingState();
  }, [user]);

  // Throttle API calls with a ref
  const saveInProgress = React.useRef(false);
  const saveQueue = React.useRef(false);
  const lastSaveTime = React.useRef<number>(0);
  const MIN_SAVE_INTERVAL = 2000; // ms - prevent saving more than once every 2 seconds
  
  // Save onboarding progress to server
  const saveProgress = async () => {
    if (!user) return;
    
    // If a save is already in progress, queue another save
    if (saveInProgress.current) {
      saveQueue.current = true;
      return;
    }
    
    // Check if we need to throttle
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTime.current;
    if (timeSinceLastSave < MIN_SAVE_INTERVAL) {
      // Wait and then try again
      console.log(`Throttling save - last save was ${timeSinceLastSave}ms ago`);
      setTimeout(() => {
        saveProgress();
      }, MIN_SAVE_INTERVAL - timeSinceLastSave);
      return;
    }
    
    saveInProgress.current = true;
    lastSaveTime.current = now;
    
    // Determine the endpoint outside the try block to make it available in catch
    const endpoint = user.role === 'driver' 
      ? '/api/drivers/onboarding-progress' 
      : '/api/rider/onboarding/progress';
      
    try {
      const completedSteps = onboardingState.steps
        .filter(step => step.completed)
        .map(step => step.id);
      
      // Create a properly structured notificationPreferences object for the JSON field
      const notificationPreferences: NotificationPrefs = {
        hasSkippedOnboarding: onboardingState.hasSkippedOnboarding,
        hasDisabledOnboarding: onboardingState.hasDisabledOnboarding,
        seenFeatures: onboardingState.seenFeatures,
        dismissedTooltips: onboardingState.dismissedTooltips,
      };
      
      const payload = {
        currentStep: onboardingState.currentStepId || 'welcome', // Provide a default value to avoid null
        completedSteps,
        hasCompletedTour: onboardingState.hasCompletedTour,
        hasCompletedFirstRide: onboardingState.hasCompletedFirstRide,
        hasCompletedProfile: onboardingState.hasCompletedProfile,
        hasSkippedOnboarding: onboardingState.hasSkippedOnboarding,
        hasDisabledOnboarding: onboardingState.hasDisabledOnboarding,
        seenFeatures: onboardingState.seenFeatures,
        dismissedTooltips: onboardingState.dismissedTooltips,
        lastActiveAt: new Date(),
        // Include the notification preferences in the dedicated JSON field
        savedNotificationPreferences: notificationPreferences
      };
      
      console.log('Saving onboarding progress:', { endpoint });
      const response = await apiRequest('POST', endpoint, payload);
      
      // Verify successful response
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `Server returned ${response.status}`);
      }
      
      console.log('Progress saved successfully');
    } catch (error) {
      console.error('Failed to save onboarding progress:', error);
      
      // Don't show toast for every failed attempt - it creates a bad UX
      // Only show if the user explicitly triggered the save action
      if (user && user.role === 'driver' && endpoint === '/api/drivers/onboarding-progress') {
        toast({
          title: "Error",
          description: "Failed to save your progress. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      saveInProgress.current = false;
      
      // If another save was requested while we were saving, do it now
      if (saveQueue.current) {
        saveQueue.current = false;
        setTimeout(() => {
          saveProgress();
        }, MIN_SAVE_INTERVAL);
      }
    }
  };

  // Set current step
  const setCurrentStepId = (stepId: string | null) => {
    setOnboardingState(prev => ({
      ...prev,
      currentStepId: stepId,
      lastActiveAt: new Date()
    }));
  };

  // Mark a step as completed
  const markStepCompleted = (stepId: string) => {
    setOnboardingState(prev => {
      const updatedSteps = prev.steps.map(step => 
        step.id === stepId ? { ...step, completed: true } : step
      );
      
      // Check if profile is complete based on required profile steps
      const profileSteps = ['profile-basic', 'profile-medical', 'emergency-contact'];
      const hasCompletedProfile = profileSteps.every(stepId => 
        updatedSteps.find(s => s.id === stepId)?.completed
      );
      
      // Also update tour and first ride flags if applicable
      const hasCompletedTour = stepId === 'platform-tour' ? true : prev.hasCompletedTour;
      const hasCompletedFirstRide = stepId === 'first-ride' ? true : prev.hasCompletedFirstRide;
      
      // Find next uncompleted step
      const uncompletedSteps = updatedSteps.filter(step => !step.completed);
      const nextStep = uncompletedSteps.length > 0 ? uncompletedSteps[0].id : null;
      
      return {
        ...prev,
        steps: updatedSteps,
        hasCompletedProfile,
        hasCompletedTour,
        hasCompletedFirstRide,
        currentStepId: nextStep,
        lastActiveAt: new Date()
      };
    });
    
    // Save progress when a step is completed
    saveProgress();
  };

  // Mark a feature as seen
  const markFeatureSeen = (featureId: string) => {
    setOnboardingState(prev => {
      if (prev.seenFeatures.includes(featureId)) {
        return prev;
      }
      
      return {
        ...prev,
        seenFeatures: [...prev.seenFeatures, featureId],
        lastActiveAt: new Date()
      };
    });
  };

  // Dismiss a tooltip
  const dismissTooltip = (tooltipId: string) => {
    setOnboardingState(prev => {
      if (prev.dismissedTooltips.includes(tooltipId)) {
        return prev;
      }
      
      return {
        ...prev,
        dismissedTooltips: [...prev.dismissedTooltips, tooltipId],
        lastActiveAt: new Date()
      };
    });
    
    // Save when tooltips are dismissed
    saveProgress();
  };

  // Reset onboarding
  const resetOnboarding = () => {
    const roleSteps = user ? addRoleSpecificSteps(user.role) : possibleSteps;
    
    setOnboardingState({
      ...initialOnboardingState,
      steps: roleSteps.map(step => ({ ...step, completed: false })),
      lastActiveAt: new Date()
    });
    
    saveProgress();
  };
  
  // Additional helper methods for components
  // Update step - similar to markStepCompleted but focused on UI step progression
  const updateStep = (stepId: string) => {
    setOnboardingState(prev => ({
      ...prev,
      currentStepId: stepId,
      lastActiveAt: new Date()
    }));
    saveProgress();
  };
  
  // Alias for setting current step (to match component expectations)
  const setCurrentStep = (stepId: string) => {
    setCurrentStepId(stepId);
    saveProgress();
  };
  
  // Complete tour
  const completeTour = () => {
    setOnboardingState(prev => ({
      ...prev,
      hasCompletedTour: true,
      steps: prev.steps.map(step => 
        step.id === 'platform-tour' ? { ...step, completed: true } : step
      ),
      lastActiveAt: new Date()
    }));
    saveProgress();
  };
  
  // Complete first ride
  const completeFirstRide = () => {
    setOnboardingState(prev => ({
      ...prev,
      hasCompletedFirstRide: true,
      steps: prev.steps.map(step => 
        step.id === 'first-ride' ? { ...step, completed: true } : step
      ),
      lastActiveAt: new Date()
    }));
    saveProgress();
  };
  
  // Complete profile
  const completeProfile = () => {
    // Profile is considered complete when these steps are done
    const profileSteps = ['profile-basic', 'profile-medical', 'emergency-contact'];
    
    setOnboardingState(prev => ({
      ...prev,
      hasCompletedProfile: true,
      steps: prev.steps.map(step => 
        profileSteps.includes(step.id) ? { ...step, completed: true } : step
      ),
      lastActiveAt: new Date()
    }));
    saveProgress();
  };
  
  // Skip onboarding - mark everything as skipped
  const skipOnboarding = () => {
    setOnboardingState(prev => ({
      ...prev,
      hasSkippedOnboarding: true,
      lastActiveAt: new Date()
    }));
    saveProgress();
  };
  
  // Permanently disable onboarding for recurring users
  const disableOnboarding = () => {
    console.log("Disabling onboarding permanently - before state update");
    
    // Update local state first with explicit boolean true
    setOnboardingState(prev => {
      const updatedState = {
        ...prev,
        hasDisabledOnboarding: true, // Explicitly use boolean true
        lastActiveAt: new Date()
      };
      
      console.log("Updated onboarding state:", {
        hasDisabledOnboarding: updatedState.hasDisabledOnboarding,
        previousValue: prev.hasDisabledOnboarding
      });
      
      return updatedState;
    });
    
    // Show confirmation toast to the user
    toast({
      title: "Help features disabled",
      description: "You can re-enable help features anytime from your settings.",
      variant: "default"
    });
    
    // Make sure to save immediately - this is an important user preference
    // But use a small timeout to ensure state has been updated first
    setTimeout(() => {
      // Capture the current state for logging
      const currentState = onboardingState;
      console.log("About to save disabled onboarding state:", {
        hasDisabledOnboarding: currentState.hasDisabledOnboarding
      });
      
      // Call the saveProgressNow function
      console.log("Calling saveProgressNow to persist preference");
      saveProgressNow();
    }, 100);
  };
  
  // Special version of saveProgress that runs immediately without throttling
  // Use this only for critical settings that must be saved right away
  const saveProgressNow = async () => {
    if (!user) {
      console.error("Cannot save onboarding progress: User not logged in");
      return;
    }
    
    // Get the current state to ensure we're using the most up-to-date values
    // This is critical for the "Don't show again" functionality
    const currentState = onboardingState;
    console.log("Current onboarding state in saveProgressNow:", {
      hasDisabledOnboarding: currentState.hasDisabledOnboarding,
      isUserLoggedIn: !!user
    });
    
    // Mark that we're saving so other save attempts will be queued
    saveInProgress.current = true;
    lastSaveTime.current = Date.now();
    
    const endpoint = user.role === 'driver' 
      ? '/api/drivers/onboarding-progress' 
      : '/api/rider/onboarding/progress';
      
    try {
      const completedSteps = onboardingState.steps
        .filter(step => step.completed)
        .map(step => step.id);
      
      // For savedNotificationPreferences, explicitly include the hasDisabledOnboarding flag
      // This is the key to making the "Don't show this again" checkbox work
      const notificationPreferences: NotificationPrefs = {
        hasSkippedOnboarding: onboardingState.hasSkippedOnboarding,
        hasDisabledOnboarding: onboardingState.hasDisabledOnboarding, // Most important field
        seenFeatures: onboardingState.seenFeatures,
        dismissedTooltips: onboardingState.dismissedTooltips,
      };
      
      // Make sure hasDisabledOnboarding is converted to a proper boolean to avoid any data type issues
      const hasDisabledOnboardingValue = onboardingState.hasDisabledOnboarding === true;
      
      const payload = {
        currentStep: onboardingState.currentStepId || 'welcome',
        completedSteps,
        hasCompletedTour: onboardingState.hasCompletedTour,
        hasCompletedFirstRide: onboardingState.hasCompletedFirstRide,
        hasCompletedProfile: onboardingState.hasCompletedProfile,
        hasSkippedOnboarding: onboardingState.hasSkippedOnboarding,
        hasDisabledOnboarding: hasDisabledOnboardingValue, // Use the explicitly checked boolean value
        seenFeatures: onboardingState.seenFeatures,
        dismissedTooltips: onboardingState.dismissedTooltips,
        lastActiveAt: new Date(),
        // Also include the notification preferences in the dedicated JSON field
        // This provides redundancy in case the direct field is lost
        savedNotificationPreferences: {
          ...notificationPreferences,
          hasDisabledOnboarding: hasDisabledOnboardingValue // Explicitly set again for redundancy
        }
      };
      
      console.log('Saving onboarding progress immediately:', { 
        endpoint,
        hasDisabledOnboarding: hasDisabledOnboardingValue,
        hasDisabledOnboardingOriginal: onboardingState.hasDisabledOnboarding,
        payloadPreferences: payload.savedNotificationPreferences,
        contextNotificationPreferences: notificationPreferences
      });
      
      const response = await apiRequest('POST', endpoint, payload);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `Server returned ${response.status}`);
      }
      
      console.log('Progress saved successfully');
    } catch (error) {
      console.error('Failed to save onboarding progress:', error);
      
      toast({
        title: "Error",
        description: "Failed to save your preferences. Please try again.",
        variant: "destructive"
      });
    } finally {
      saveInProgress.current = false;
      
      // If another save was requested while we were saving, do it now
      if (saveQueue.current) {
        saveQueue.current = false;
        setTimeout(() => {
          saveProgress();
        }, 100); // Short delay
      }
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        onboardingState,
        setCurrentStepId,
        markStepCompleted,
        markFeatureSeen,
        dismissTooltip,
        resetOnboarding,
        skipOnboarding,
        disableOnboarding,
        isLoading,
        saveProgress,
        // Additional methods for components
        updateStep,
        completeTour,
        completeFirstRide,
        completeProfile,
        setCurrentStep,
        dismissedTooltips: onboardingState.dismissedTooltips
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  
  return context;
};
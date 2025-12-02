import { Router } from 'express';
import { storage } from '../storage';
import { isAuthenticated, hasRole } from '../middleware/auth';
import { z } from 'zod';
import { onboardingNotificationService } from '../onboarding-notification-service';
import { notificationService, NotificationType } from '../notifications';

const router = Router();

// Schema for onboarding progress (matching the database schema definition)
const onboardingProgressSchema = z.object({
  currentStep: z.string().default("welcome"),
  onboardingCompleted: z.boolean().optional(),
  profileCompletionPercentage: z.number().optional(),
  isFirstRide: z.boolean().optional(),
  completedTours: z.any().optional(), // JSON field in database
  savedProfileData: z.any().optional(), // JSON field in database
  savedAccessibilityData: z.any().optional(), // JSON field in database
  savedLocationsData: z.any().optional(), // JSON field in database
  savedPaymentData: z.any().optional(), // JSON field in database
  savedNotificationPreferences: z.any().optional(), // JSON field in database
  // Track these as part of saved data
  hasSkippedOnboarding: z.boolean().optional(),
  seenFeatures: z.array(z.string()).optional(),
  dismissedTooltips: z.array(z.string()).optional(),
  lastActiveAt: z.union([
    z.date(), 
    z.string().transform((str) => new Date(str))
  ]).optional(),
});

// Get rider onboarding progress
router.get('/progress', isAuthenticated, async (req, res) => {
  // Check if user has rider or admin role
  if (!req.user || (req.user.role !== 'rider' && req.user.role !== 'admin')) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  try {
    const userId = req.user!.id;
    
    // Get onboarding progress from storage
    const onboardingProgress = await storage.getRiderOnboardingProgress(userId);
    
    if (!onboardingProgress) {
      // If no progress exists, initialize with default values matching the database schema
      const defaultProgress = {
        userId,
        currentStep: 'welcome',
        onboardingCompleted: false,
        profileCompletionPercentage: 0,
        isFirstRide: true,
        completedTours: JSON.stringify([]),
        savedProfileData: JSON.stringify({}),
        savedAccessibilityData: JSON.stringify({}),
        savedLocationsData: JSON.stringify([]),
        savedPaymentData: JSON.stringify({}),
        savedNotificationPreferences: JSON.stringify({
          hasSkippedOnboarding: false,
          hasDisabledOnboarding: false, // Added explicit flag for disabling onboarding
          seenFeatures: [],
          dismissedTooltips: []
        })
      };
      
      // Create initial onboarding progress
      await storage.createRiderOnboardingProgress(defaultProgress);
      return res.status(200).json(defaultProgress);
    }
    
    return res.status(200).json(onboardingProgress);
  } catch (error) {
    console.error('Error fetching rider onboarding progress:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch onboarding progress',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Update rider onboarding progress
router.post('/progress', isAuthenticated, async (req, res) => {
  // Check if user has rider or admin role
  if (!req.user || (req.user.role !== 'rider' && req.user.role !== 'admin')) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  try {
    const userId = req.user!.id;
    
    // Validate request body
    const validatedData = onboardingProgressSchema.parse(req.body);
    
    // Check if progress exists
    const existingProgress = await storage.getRiderOnboardingProgress(userId);
    
    if (!existingProgress) {
      // Create new progress record if it doesn't exist
      const newProgress = {
        userId,
        ...validatedData,
        lastActiveAt: new Date()
      };
      
      await storage.createRiderOnboardingProgress(newProgress);
      return res.status(201).json(newProgress);
    }
    
    // Update existing progress
    const updatedProgress = {
      ...validatedData,
      lastActiveAt: new Date()
    };
    
    await storage.updateRiderOnboardingProgress(userId, updatedProgress);
    
    // Check if we should send profile completion reminder
    // Get completion percentage from validated data
    const profileCompletionPercentage = validatedData.profileCompletionPercentage;
    
    if (profileCompletionPercentage !== undefined && existingProgress.profileCompletionPercentage !== null && 
        profileCompletionPercentage > existingProgress.profileCompletionPercentage) {
      
      // If profile is 25%, 50%, or 75% complete, send a reminder notification
      if (profileCompletionPercentage === 25 || profileCompletionPercentage === 50 || profileCompletionPercentage === 75) {
        const user = await storage.getUser(userId);
        if (user) {
          await onboardingNotificationService.sendProfileCompletionReminder(user, profileCompletionPercentage);
        }
      }
      
      // Check for completion conversions using the savedNotificationPreferences field
      // Parse the existing notification preferences
      const existingPrefs = existingProgress.savedNotificationPreferences 
        ? (typeof existingProgress.savedNotificationPreferences === 'string' 
            ? JSON.parse(existingProgress.savedNotificationPreferences)
            : existingProgress.savedNotificationPreferences) 
        : {};
      
      // Parse the new notification preferences
      const newPrefs = validatedData.savedNotificationPreferences 
        ? (typeof validatedData.savedNotificationPreferences === 'string'
            ? JSON.parse(validatedData.savedNotificationPreferences) 
            : validatedData.savedNotificationPreferences)
        : {};
      
      // Profile completion notification
      if (profileCompletionPercentage >= 100 && existingProgress.profileCompletionPercentage < 100) {
        const user = await storage.getUser(userId);
        if (user) {
          await notificationService.createAndSendNotification({
            userId: user.id,
            type: NotificationType.ADMIN_ANNOUNCEMENT,
            title: 'Profile Completed!',
            message: 'Congratulations on completing your profile! This will help us match you with the right transportation options.',
          });
        }
      }
      
      // First ride notification if isFirstRide changes from true to false
      if (existingProgress.isFirstRide === true && validatedData.isFirstRide === false) {
        const user = await storage.getUser(userId);
        if (user) {
          await notificationService.createAndSendNotification({
            userId: user.id,
            type: NotificationType.ADMIN_ANNOUNCEMENT,
            title: 'First Ride Complete!',
            message: 'You\'ve completed your first ride! Rate your experience to help other riders and drivers.',
          });
        }
      }
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'Onboarding progress updated successfully'
    });
  } catch (error) {
    console.error('Error updating rider onboarding progress:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid request data',
        errors: error.errors
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update onboarding progress',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Reset rider onboarding progress
router.post('/reset-progress', isAuthenticated, async (req, res) => {
  // Check if user has rider or admin role
  if (!req.user || (req.user.role !== 'rider' && req.user.role !== 'admin')) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  try {
    const userId = req.user!.id;
    
    // Default onboarding state - matching the database schema
    const defaultProgress = {
      currentStep: 'welcome',
      onboardingCompleted: false,
      profileCompletionPercentage: 0,
      isFirstRide: true,
      completedTours: JSON.stringify([]),
      savedProfileData: JSON.stringify({}),
      savedAccessibilityData: JSON.stringify({}),
      savedLocationsData: JSON.stringify([]),
      savedPaymentData: JSON.stringify({}),
      savedNotificationPreferences: JSON.stringify({
        hasSkippedOnboarding: false,
        hasDisabledOnboarding: false, // Added explicit flag for disabling onboarding
        seenFeatures: [],
        dismissedTooltips: []
      })
    };
    
    // Reset progress
    await storage.updateRiderOnboardingProgress(userId, defaultProgress);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Onboarding progress reset successfully',
      data: defaultProgress
    });
  } catch (error) {
    console.error('Error resetting rider onboarding progress:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reset onboarding progress',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint to request first ride assistance
router.post('/first-ride-assistance', isAuthenticated, hasRole('rider'), async (req, res) => {
  try {
    const userId = req.user!.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Send first ride assistance notification
    await onboardingNotificationService.sendFirstRideAssistance(user);
    
    return res.status(200).json({ 
      success: true, 
      message: 'First ride assistance information sent'
    });
  } catch (error) {
    console.error('Error sending first ride assistance:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send first ride assistance',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
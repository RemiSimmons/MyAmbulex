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
  completedSteps: z.array(z.string()).optional(),
  hasCompletedTour: z.boolean().optional(),
  hasCompletedFirstRide: z.boolean().optional(),
  hasCompletedProfile: z.boolean().optional(),
  hasSkippedOnboarding: z.boolean().optional(),
  hasDisabledOnboarding: z.boolean().optional(),
  seenFeatures: z.array(z.string()).optional(),
  dismissedTooltips: z.array(z.string()).optional(),
  savedNotificationPreferences: z.any().optional(), // JSON field in database
  lastActiveAt: z.union([
    z.date(), 
    z.string().transform((str) => new Date(str))
  ]).optional(),
});

// Get driver onboarding progress
router.get('/', isAuthenticated, hasRole('driver'), async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Get onboarding progress from storage
    const onboardingProgress = await storage.getDriverOnboardingProgress(userId);
    
    if (!onboardingProgress) {
      // If no progress exists, initialize with default values matching the database schema
      const defaultProgress = {
        userId,
        currentStep: 'welcome',
        completedSteps: [],
        hasCompletedTour: false,
        hasCompletedFirstRide: false,
        hasCompletedProfile: false,
        hasSkippedOnboarding: false,
        hasDisabledOnboarding: false,
        seenFeatures: [],
        dismissedTooltips: [],
        savedNotificationPreferences: JSON.stringify({
          hasSkippedOnboarding: false,
          hasDisabledOnboarding: false, // Explicitly include the flag
          seenFeatures: [],
          dismissedTooltips: []
        })
      };
      
      // Create initial onboarding progress
      await storage.createDriverOnboardingProgress(defaultProgress);
      return res.status(200).json(defaultProgress);
    }
    
    return res.status(200).json(onboardingProgress);
  } catch (error) {
    console.error('Error fetching driver onboarding progress:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch onboarding progress',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Update driver onboarding progress
router.post('/', isAuthenticated, hasRole('driver'), async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Validate request body
    const validatedData = onboardingProgressSchema.parse(req.body);
    
    // Check if progress exists
    const existingProgress = await storage.getDriverOnboardingProgress(userId);
    
    if (!existingProgress) {
      // Create new progress record if it doesn't exist
      const newProgress = {
        userId,
        ...validatedData,
        lastActiveAt: new Date()
      };
      
      await storage.createDriverOnboardingProgress(newProgress);
      return res.status(201).json({
        success: true,
        message: 'Onboarding progress created successfully',
        data: newProgress
      });
    }
    
    // Update existing progress
    const updatedProgress = {
      ...validatedData,
      lastActiveAt: new Date()
    };
    
    await storage.updateDriverOnboardingProgress(userId, updatedProgress);
    
    // Parse the updated notification preferences
    // This is critical for the "Don't show this again" checkbox to work properly
    const notificationPrefs = validatedData.savedNotificationPreferences 
      ? (typeof validatedData.savedNotificationPreferences === 'string'
          ? JSON.parse(validatedData.savedNotificationPreferences) 
          : validatedData.savedNotificationPreferences)
      : {};
    
    // Log the updated preferences to help with debugging
    console.log('Updated driver onboarding preferences:', {
      userId,
      hasDisabledOnboarding: validatedData.hasDisabledOnboarding,
      savedNotificationPreferences: notificationPrefs
    });
    
    return res.status(200).json({ 
      success: true, 
      message: 'Onboarding progress updated successfully'
    });
  } catch (error) {
    console.error('Error updating driver onboarding progress:', error);
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

// Reset driver onboarding progress
router.post('/reset', isAuthenticated, hasRole('driver'), async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Default onboarding state - matching the database schema
    const defaultProgress = {
      currentStep: 'welcome',
      completedSteps: [],
      hasCompletedTour: false,
      hasCompletedFirstRide: false,
      hasCompletedProfile: false,
      hasSkippedOnboarding: false,
      hasDisabledOnboarding: false,
      seenFeatures: [],
      dismissedTooltips: [],
      savedNotificationPreferences: JSON.stringify({
        hasSkippedOnboarding: false,
        hasDisabledOnboarding: false, // Explicitly include the flag
        seenFeatures: [],
        dismissedTooltips: []
      })
    };
    
    // Reset progress
    await storage.updateDriverOnboardingProgress(userId, defaultProgress);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Onboarding progress reset successfully',
      data: defaultProgress
    });
  } catch (error) {
    console.error('Error resetting driver onboarding progress:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reset onboarding progress',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
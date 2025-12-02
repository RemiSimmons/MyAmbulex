import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth';
import { storage } from '../storage';
import { onboardingNotificationService } from '../onboarding-notification-service';

const router = Router();

/**
 * Send welcome notification to a user
 * POST /api/onboarding/notifications/welcome
 */
router.post('/welcome', isAuthenticated, async (req, res) => {
  try {
    // Use the authenticated user or specified user ID if admin is sending
    const userId = req.body.userId || req.user!.id;
    
    // Only admins can send welcome notifications to other users
    if (req.body.userId && req.user!.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can send welcome notifications to other users'
      });
    }
    
    // Get user information
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Send welcome notification
    await onboardingNotificationService.sendWelcomeNotifications(user);
    
    return res.status(200).json({
      success: true,
      message: 'Welcome notification sent successfully'
    });
  } catch (error) {
    console.error('Error sending welcome notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send welcome notification',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Send a profile completion reminder to a user
 * POST /api/onboarding/notifications/profile-reminder
 */
router.post('/profile-reminder', isAuthenticated, async (req, res) => {
  try {
    // Use the authenticated user or specified user ID if admin is sending
    const userId = req.body.userId || req.user!.id;
    
    // Only admins can send reminders to other users
    if (req.body.userId && req.user!.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can send profile reminders to other users'
      });
    }
    
    // Get user information
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get profile completion percentage from request or calculate it
    let completionPercentage = req.body.completionPercentage;
    
    if (!completionPercentage) {
      // Get onboarding progress to calculate completion percentage
      const progress = user.role === 'rider'
        ? await storage.getRiderOnboardingProgress(userId)
        : await storage.getDriverOnboardingProgress(userId);
      
      completionPercentage = progress?.profileCompletionPercentage || 0;
    }
    
    // Send profile completion reminder
    await onboardingNotificationService.sendProfileCompletionReminder(user, completionPercentage);
    
    return res.status(200).json({
      success: true,
      message: 'Profile completion reminder sent successfully'
    });
  } catch (error) {
    console.error('Error sending profile completion reminder:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send profile completion reminder',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Send first ride assistance notification to a rider
 * POST /api/onboarding/notifications/first-ride-assistance
 */
router.post('/first-ride-assistance', isAuthenticated, async (req, res) => {
  try {
    // Use the authenticated user or specified user ID if admin is sending
    const userId = req.body.userId || req.user!.id;
    
    // Only admins can send assistance to other users
    if (req.body.userId && req.user!.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can send first ride assistance to other users'
      });
    }
    
    // Get user information
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Ensure user is a rider
    if (user.role !== 'rider') {
      return res.status(400).json({
        success: false,
        message: 'First ride assistance can only be sent to riders'
      });
    }
    
    // Send first ride assistance
    await onboardingNotificationService.sendFirstRideAssistance(user);
    
    return res.status(200).json({
      success: true,
      message: 'First ride assistance sent successfully'
    });
  } catch (error) {
    console.error('Error sending first ride assistance:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send first ride assistance',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
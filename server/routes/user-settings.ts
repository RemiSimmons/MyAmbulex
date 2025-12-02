import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

const router = Router();

// Get user settings including notification preferences
router.get('/api/user/settings', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Remove sensitive information before sending
    const { password, ...safeUser } = user;
    
    res.json(safeUser);
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({ message: 'Failed to fetch user settings' });
  }
});

// Update user notification preferences
router.patch('/api/user/notification-preferences', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Define validation schema for notification preferences
    const notificationPreferencesSchema = z.object({
      notificationPreferences: z.object({
        email: z.boolean(),
        sms: z.boolean(),
        push: z.boolean()
      })
    });
    
    // Validate request body
    const validationResult = notificationPreferencesSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid notification preferences data', 
        errors: validationResult.error.format() 
      });
    }
    
    // Update the user's notification preferences
    const updatedUser = await storage.updateUser(userId, {
      notificationPreferences: req.body.notificationPreferences
    });
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Remove sensitive information before sending
    const { password, ...safeUser } = updatedUser;
    
    res.json(safeUser);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ message: 'Failed to update notification preferences' });
  }
});

export default router;
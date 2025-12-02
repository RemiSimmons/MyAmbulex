import { Router } from 'express';
import type { Request, Response } from 'express';
import { storage } from '../../storage';
import { isAuthenticated } from '../../middleware/auth';
import { z } from 'zod';
import { insertUserProfileSchema } from '@shared/schema';

const router = Router();

// Update user profile
router.put('/api/user/profile', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const validatedData = insertUserProfileSchema.parse(req.body);
    
    const updatedUser = await storage.updateUserProfile(req.user.id, validatedData);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Delete user account
router.delete('/api/user/delete-account', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { confirmationText } = req.body;
    
    if (confirmationText !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({ 
        error: 'Invalid confirmation text. Please type "DELETE MY ACCOUNT" to confirm.' 
      });
    }

    // Soft delete user account
    await storage.deleteUserAccount(req.user.id);
    
    // Logout user
    req.logout((err) => {
      if (err) {
        console.error('Error logging out user during account deletion:', err);
      }
    });
    
    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
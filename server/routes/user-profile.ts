import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { insertUserProfileSchema } from '@shared/schema';
import { z } from 'zod';

const router = Router();

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

// Get user profile
router.get('/api/user-profile', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Get the user profile
    const profile = await storage.getUserProfile(userId);
    
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    
    res.json(profile);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Failed to fetch user profile' });
  }
});

// Create or update user profile
router.put('/api/user-profile', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Validate request body
    const validationResult = insertUserProfileSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid profile data', 
        errors: validationResult.error.format() 
      });
    }
    
    // Check if profile exists
    const existingProfile = await storage.getUserProfile(userId);
    
    if (existingProfile) {
      // Update existing profile
      const updatedProfile = await storage.updateUserProfile(userId, req.body);
      res.json(updatedProfile);
    } else {
      // Create new profile
      const profileData = {
        ...req.body,
        userId,
      };
      
      const newProfile = await storage.createUserProfile(profileData);
      res.status(201).json(newProfile);
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Failed to update user profile' });
  }
});

// Get driver details
router.get('/api/driver-details', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Check if user is a driver
    if (req.user!.role !== 'driver') {
      return res.status(403).json({ message: 'Access denied: User is not a driver' });
    }
    
    // Get the driver details
    const driverDetails = await storage.getDriverDetails(userId);
    
    if (!driverDetails) {
      return res.status(404).json({ message: 'Driver details not found' });
    }
    
    res.json(driverDetails);
  } catch (error) {
    console.error('Error fetching driver details:', error);
    res.status(500).json({ message: 'Failed to fetch driver details' });
  }
});

// Create or update driver details
router.put('/api/driver-details', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Check if user is a driver
    if (req.user!.role !== 'driver') {
      return res.status(403).json({ message: 'Access denied: User is not a driver' });
    }
    
    // Check if driver details exist
    const existingDetails = await storage.getDriverDetails(userId);
    
    if (existingDetails) {
      // Update existing driver details
      const updatedDetails = await storage.updateDriverDetails(userId, req.body);
      res.json(updatedDetails);
    } else {
      // Create new driver details
      const driverData = {
        ...req.body,
        userId,
      };
      
      const newDetails = await storage.createDriverDetails(driverData);
      res.status(201).json(newDetails);
    }
  } catch (error) {
    console.error('Error updating driver details:', error);
    res.status(500).json({ message: 'Failed to update driver details' });
  }
});

// Update basic user information
router.patch('/api/user', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Define validation schema for user update
    const userUpdateSchema = z.object({
      fullName: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().min(8).optional(),
      preferredLanguage: z.string().optional(),
      timezone: z.string().optional(),
      profileImageUrl: z.string().optional(),
    });
    
    // Validate request body
    const validationResult = userUpdateSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid user data', 
        errors: validationResult.error.format() 
      });
    }
    
    // Update the user
    const updatedUser = await storage.updateUser(userId, req.body);
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Export router
export default router;
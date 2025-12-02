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

// Get user profile data
router.get('/api/user/profile', isAuthenticated, async (req: Request, res: Response) => {
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
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Failed to fetch user profile' });
  }
});

// Update user profile
router.patch('/api/user/profile', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Define validation schema for profile update
    const profileUpdateSchema = z.object({
      fullName: z.string().min(2, "Full name must be at least 2 characters").optional(),
      email: z.string().email("Please enter a valid email address").optional(),
      phone: z.string().min(10, "Phone number must be at least 10 digits").optional(),
      preferredLanguage: z.string().optional(),
      timezone: z.string().optional(),
      profileImageUrl: z.string().url().optional(),
    });
    
    // Validate request body
    const validationResult = profileUpdateSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid profile data', 
        errors: validationResult.error.format() 
      });
    }
    
    // Update the user
    const updatedUser = await storage.updateUser(userId, req.body);
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Remove sensitive information before sending
    const { password, ...safeUser } = updatedUser;
    
    res.json(safeUser);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Failed to update user profile' });
  }
});

export default router;
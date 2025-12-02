import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertUserProfileSchema } from "@shared/schema";
import { isAuthenticated, hasRole } from "../middleware/auth";

const router = Router();

// Remove local isRider - use the centralized middleware

// Get rider profile
router.get("/profile", isAuthenticated, hasRole('rider'), async (req: Request, res: Response) => {
  try {
    // Fetch the user profile from storage
    const profile = await storage.getUserProfile(req.user!.id);
    
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }
    
    res.json(profile);
  } catch (error) {
    console.error("Error retrieving rider profile:", error);
    res.status(500).json({ message: "An error occurred while retrieving your profile" });
  }
});

// Update banking information
router.post("/banking-info", isAuthenticated, hasRole('rider'), async (req: Request, res: Response) => {
  try {
    // Create a banking info schema based on the user profile schema
    const bankingInfoSchema = insertUserProfileSchema.pick({
      accountHolderName: true,
      accountType: true,
      bankName: true,
      routingNumber: true,
      accountNumber: true,
      billingAddress: true,
      billingCity: true,
      billingState: true,
      billingZipCode: true,
      paymentPreference: true,
    });
    
    // Parse and validate the request body
    const validatedData = bankingInfoSchema.parse(req.body);
    
    // Get the existing profile or create a new one
    let profile = await storage.getUserProfile(req.user!.id);
    
    if (profile) {
      // Update the existing profile with banking info
      profile = await storage.updateUserProfile(req.user!.id, {
        ...validatedData,
      });
    } else {
      // Create a new profile with banking info
      profile = await storage.createUserProfile({
        userId: req.user!.id,
        ...validatedData,
      });
    }
    
    res.status(200).json({ message: "Banking information updated successfully", profile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Validation error
      return res.status(400).json({ 
        message: "Invalid input data", 
        errors: error.errors 
      });
    }
    
    console.error("Error updating banking information:", error);
    res.status(500).json({ message: "An error occurred while updating banking information" });
  }
});

export default router;
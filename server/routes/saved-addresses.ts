import { Router, Request, Response } from "express";
import { z } from "zod";
import { insertSavedAddressSchema, SavedAddress } from "@shared/schema";
import { storage } from "../storage";

const router = Router();

// Middleware to ensure the user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  console.log("Auth check:", {
    isAuthenticated: req.isAuthenticated(),
    hasSession: !!req.session,
    hasSessionID: !!req.sessionID,
    sessionID: req.sessionID
  });
  
  if (!req.isAuthenticated()) {
    console.log("User not authenticated, sending 401");
    return res.status(401).send("Unauthorized");
  }
  console.log("User authenticated:", { id: req.user!.id, username: req.user!.username });
  next();
};

// GET: Fetch all saved addresses for the current user
router.get("/", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const addresses = await storage.getSavedAddressesByUserId(req.user!.id);
    
    // Sort addresses: default first, then by name
    const sortedAddresses = addresses.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });
    
    res.status(200).json(sortedAddresses);
  } catch (error) {
    console.error("Error fetching saved addresses:", error);
    res.status(500).send("Failed to retrieve saved addresses");
  }
});

// GET: Fetch a specific saved address by ID
router.get("/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const addressId = parseInt(req.params.id);
    if (isNaN(addressId)) {
      return res.status(400).send("Invalid address ID");
    }
    
    const address = await storage.getSavedAddressById(addressId);
    
    if (!address) {
      return res.status(404).send("Address not found");
    }
    
    // Ensure the address belongs to the requesting user
    if (address.userId !== req.user!.id) {
      return res.status(403).send("You do not have permission to view this address");
    }
    
    res.status(200).json(address);
  } catch (error) {
    console.error("Error fetching saved address:", error);
    res.status(500).send("Failed to retrieve saved address");
  }
});

// POST: Create a new saved address
router.post("/", isAuthenticated, async (req: Request, res: Response) => {
  try {
    console.log("Received saved address creation request:", {
      body: req.body,
      isAuthenticated: req.isAuthenticated(),
      user: req.user ? { id: req.user.id, username: req.user.username } : null
    });
    
    const validatedData = insertSavedAddressSchema.parse({
      ...req.body,
      userId: req.user!.id,
    });
    
    console.log("Validated data for saved address:", validatedData);
    
    // If this is being set as the default address, unset any existing default
    if (validatedData.isDefault) {
      await storage.unsetDefaultAddress(req.user!.id);
    }
    
    const newAddress = await storage.createSavedAddress(validatedData);
    console.log("Created new saved address:", newAddress);
    res.status(201).json(newAddress);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Zod validation error:", error.errors);
      return res.status(400).json({ errors: error.errors });
    }
    console.error("Error creating saved address:", error);
    res.status(500).send("Failed to create saved address");
  }
});

// PUT: Update an existing saved address
router.put("/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const addressId = parseInt(req.params.id);
    if (isNaN(addressId)) {
      return res.status(400).send("Invalid address ID");
    }
    
    // Check if the address exists and belongs to the user
    const existingAddress = await storage.getSavedAddressById(addressId);
    if (!existingAddress) {
      return res.status(404).send("Address not found");
    }
    
    if (existingAddress.userId !== req.user!.id) {
      return res.status(403).send("You do not have permission to update this address");
    }
    
    // Validate the update data
    const validatedData = insertSavedAddressSchema
      .omit({ userId: true })
      .parse(req.body);
    
    // If this is being set as the default address, unset any existing default
    if (validatedData.isDefault && !existingAddress.isDefault) {
      await storage.unsetDefaultAddress(req.user!.id);
    }
    
    // Update the address
    const updatedAddress = await storage.updateSavedAddress(
      addressId,
      {
        ...validatedData,
        userId: req.user!.id
      }
    );
    
    res.status(200).json(updatedAddress);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error("Error updating saved address:", error);
    res.status(500).send("Failed to update saved address");
  }
});

// DELETE: Remove a saved address
router.delete("/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const addressId = parseInt(req.params.id);
    if (isNaN(addressId)) {
      return res.status(400).send("Invalid address ID");
    }
    
    // Check if the address exists and belongs to the user
    const existingAddress = await storage.getSavedAddressById(addressId);
    if (!existingAddress) {
      return res.status(404).send("Address not found");
    }
    
    if (existingAddress.userId !== req.user!.id) {
      return res.status(403).send("You do not have permission to delete this address");
    }
    
    // Delete the address
    await storage.deleteSavedAddress(addressId);
    
    res.status(200).send("Address deleted successfully");
  } catch (error) {
    console.error("Error deleting saved address:", error);
    res.status(500).send("Failed to delete saved address");
  }
});

export default router;
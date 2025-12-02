import express, { Request, Response } from "express";
import { validate } from "../middleware/validate";
import { z } from "zod";
import { storage } from "../storage";
import { isAuthenticated, hasRole } from "../middleware/auth";

const router = express.Router();

// JSON schema for filter create/update validation
const createFilterSchema = z.object({
  name: z.string().min(1, "Filter name is required"),
  isDefault: z.boolean().optional(),
  maxDistance: z.number().int().positive().optional(),
  minDistance: z.number().int().min(0).optional(),
  serviceBoundaries: z.array(z.object({
    lat: z.number(),
    lng: z.number()
  })).optional(),
  minPrice: z.number().nonnegative().optional(),
  pricePerMile: z.number().nonnegative().optional(),
  pricePerMinute: z.number().nonnegative().optional(),
  vehicleTypes: z.array(z.string()).optional(),
  canProvideRamp: z.boolean().optional(),
  canProvideCompanion: z.boolean().optional(),
  canProvideStairChair: z.boolean().optional(),
  maxWaitTimeMinutes: z.number().int().nonnegative().optional(),
  timeWindows: z.array(z.object({
    day: z.string(),
    startTime: z.string(),
    endTime: z.string()
  })).optional(),
  excludeHolidays: z.boolean().optional(),
  patientConditions: z.array(z.string()).optional(),
  mobilityLevels: z.array(z.string()).optional(),
  specialEquipment: z.array(z.string()).optional(),
  preferRoundTrips: z.boolean().optional(),
  preferRegularClients: z.boolean().optional(),
  notificationEnabled: z.boolean().optional(),
  priority: z.number().int().min(1).max(10).optional(),
  active: z.boolean().optional(),
});

// Get all ride filters for a driver
router.get("/", isAuthenticated, hasRole("driver"), async (req: Request, res: Response) => {
  try {
    const driverId = req.user!.id;
    
    // Get the driver details ID from the user ID
    const driverDetails = await storage.getDriverDetailsByUserId(driverId);
    
    if (!driverDetails) {
      return res.status(404).json({ message: "Driver details not found" });
    }
    
    const filters = await storage.getDriverRideFilters(driverDetails.id);
    res.json(filters);
  } catch (error: any) {
    console.error("Error fetching driver ride filters:", error);
    res.status(500).json({ message: `Error fetching ride filters: ${error.message}` });
  }
});

// Get a specific ride filter
router.get("/:id", isAuthenticated, hasRole("driver"), async (req: Request, res: Response) => {
  try {
    const driverId = req.user!.id;
    const filterId = parseInt(req.params.id);
    
    // Get the driver details ID from the user ID
    const driverDetails = await storage.getDriverDetailsByUserId(driverId);
    
    if (!driverDetails) {
      return res.status(404).json({ message: "Driver details not found" });
    }
    
    const filter = await storage.getDriverRideFilterById(filterId);
    
    if (!filter) {
      return res.status(404).json({ message: "Filter not found" });
    }
    
    // Ensure the filter belongs to the requesting driver
    if (filter.driverId !== driverDetails.id) {
      return res.status(403).json({ message: "Unauthorized to access this filter" });
    }
    
    res.json(filter);
  } catch (error: any) {
    console.error("Error fetching driver ride filter:", error);
    res.status(500).json({ message: `Error fetching ride filter: ${error.message}` });
  }
});

// Create a new ride filter
router.post(
  "/",
  isAuthenticated,
  hasRole("driver"),
  validate(createFilterSchema),
  async (req: Request, res: Response) => {
    try {
      const driverId = req.user!.id;
      
      // Get the driver details ID from the user ID
      const driverDetails = await storage.getDriverDetailsByUserId(driverId);
      
      if (!driverDetails) {
        return res.status(404).json({ message: "Driver details not found" });
      }
      
      // Create the filter
      const filter = await storage.createDriverRideFilter({
        ...req.body,
        driverId: driverDetails.id
      });
      
      // If this is marked as default, update other filters to not be default
      if (req.body.isDefault) {
        await storage.updateDriverRideFiltersDefaultStatus(driverDetails.id, filter.id);
      }
      
      res.status(201).json(filter);
    } catch (error: any) {
      console.error("Error creating driver ride filter:", error);
      res.status(500).json({ message: `Error creating ride filter: ${error.message}` });
    }
  }
);

// Update a ride filter
router.put(
  "/:id",
  isAuthenticated,
  hasRole("driver"),
  validate(createFilterSchema),
  async (req: Request, res: Response) => {
    try {
      const driverId = req.user!.id;
      const filterId = parseInt(req.params.id);
      
      // Get the driver details ID from the user ID
      const driverDetails = await storage.getDriverDetailsByUserId(driverId);
      
      if (!driverDetails) {
        return res.status(404).json({ message: "Driver details not found" });
      }
      
      // Check if the filter exists and belongs to this driver
      const existingFilter = await storage.getDriverRideFilterById(filterId);
      
      if (!existingFilter) {
        return res.status(404).json({ message: "Filter not found" });
      }
      
      if (existingFilter.driverId !== driverDetails.id) {
        return res.status(403).json({ message: "Unauthorized to update this filter" });
      }
      
      // Update the filter
      const updatedFilter = await storage.updateDriverRideFilter(filterId, req.body);
      
      // If this is marked as default, update other filters to not be default
      if (req.body.isDefault) {
        await storage.updateDriverRideFiltersDefaultStatus(driverDetails.id, filterId);
      }
      
      res.json(updatedFilter);
    } catch (error: any) {
      console.error("Error updating driver ride filter:", error);
      res.status(500).json({ message: `Error updating ride filter: ${error.message}` });
    }
  }
);

// Delete a ride filter
router.delete("/:id", isAuthenticated, hasRole("driver"), async (req: Request, res: Response) => {
  try {
    const driverId = req.user!.id;
    const filterId = parseInt(req.params.id);
    
    // Get the driver details ID from the user ID
    const driverDetails = await storage.getDriverDetailsByUserId(driverId);
    
    if (!driverDetails) {
      return res.status(404).json({ message: "Driver details not found" });
    }
    
    // Check if the filter exists and belongs to this driver
    const existingFilter = await storage.getDriverRideFilterById(filterId);
    
    if (!existingFilter) {
      return res.status(404).json({ message: "Filter not found" });
    }
    
    if (existingFilter.driverId !== driverDetails.id) {
      return res.status(403).json({ message: "Unauthorized to delete this filter" });
    }
    
    // Delete the filter
    await storage.deleteDriverRideFilter(filterId);
    
    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting driver ride filter:", error);
    res.status(500).json({ message: `Error deleting ride filter: ${error.message}` });
  }
});

// Apply a filter to the available rides
router.get(
  "/:id/apply", 
  isAuthenticated, 
  hasRole("driver"), 
  async (req: Request, res: Response) => {
    try {
      const driverId = req.user!.id;
      const filterId = parseInt(req.params.id);
      
      // Get the driver details ID from the user ID
      const driverDetails = await storage.getDriverDetailsByUserId(driverId);
      
      if (!driverDetails) {
        return res.status(404).json({ message: "Driver details not found" });
      }
      
      // Check if the filter exists and belongs to this driver
      const existingFilter = await storage.getDriverRideFilterById(filterId);
      
      if (!existingFilter) {
        return res.status(404).json({ message: "Filter not found" });
      }
      
      if (existingFilter.driverId !== driverDetails.id) {
        return res.status(403).json({ message: "Unauthorized to use this filter" });
      }
      
      // Get filtered rides
      const filteredRides = await storage.getFilteredRidesByDriver(driverId, filterId);
      
      res.json(filteredRides);
    } catch (error: any) {
      console.error("Error applying driver ride filter:", error);
      res.status(500).json({ message: `Error applying ride filter: ${error.message}` });
    }
  }
);

export default router;
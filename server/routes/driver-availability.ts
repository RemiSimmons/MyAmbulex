import { Router, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { isAuthenticated, hasRole } from "../middleware/auth";
import { z } from "zod";
import { insertDriverAvailabilityScheduleSchema, insertDriverBlockedTimeSchema } from "@shared/schema";
import { validate } from "../middleware/validate";

const router = Router();

// Extend the Request type to include driverId property
declare global {
  namespace Express {
    interface Request {
      driverId?: number;
    }
  }
}

// Remove local isDriver middleware - using centralized auth

// Middleware to get driver details from user
async function getDriverId(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const driverDetails = await storage.getDriverDetails(req.user!.id);
    if (!driverDetails) {
      return res.status(404).json({ message: "Driver details not found" });
    }
    
    // Attach driver ID to request for use in routes
    req.driverId = driverDetails.id;
    next();
  } catch (error) {
    console.error("Error in getDriverId middleware:", error);
    res.status(500).json({ message: "Server error fetching driver details" });
  }
}

// Driver availability schedule routes
// GET /api/driver/availability
router.get("/availability", isAuthenticated, hasRole('driver'), getDriverId, async (req: Request, res: Response) => {
  try {
    if (!req.driverId) {
      return res.status(400).json({ message: "Missing driver ID" });
    }
    
    const schedules = await storage.getDriverAvailabilitySchedules(req.driverId);
    res.json(schedules);
  } catch (error) {
    console.error("Error fetching driver availability schedules:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/driver/availability/:id
router.get("/availability/:id", isAuthenticated, hasRole('driver'), getDriverId, async (req: Request, res: Response) => {
  try {
    if (!req.driverId) {
      return res.status(400).json({ message: "Missing driver ID" });
    }
    
    const schedule = await storage.getDriverAvailabilitySchedule(parseInt(req.params.id));
    
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }
    
    // Check if schedule belongs to the authenticated driver
    if (schedule.driverId !== req.driverId) {
      return res.status(403).json({ message: "Unauthorized access to this schedule" });
    }
    
    res.json(schedule);
  } catch (error) {
    console.error("Error fetching driver availability schedule:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Middleware to inject driverId into request body
function injectDriverId(req: Request, res: Response, next: NextFunction) {
  if (req.driverId) {
    req.body.driverId = req.driverId;
  }
  next();
}

// POST /api/driver/availability
router.post(
  "/availability",
  isAuthenticated,
  hasRole('driver'),
  getDriverId,
  injectDriverId,
  validate(insertDriverAvailabilityScheduleSchema),
  async (req: Request, res: Response) => {
    try {
      if (!req.driverId) {
        return res.status(400).json({ message: "Missing driver ID" });
      }
      
      // Ensure the driver ID in the body matches the authenticated driver
      if (req.body.driverId && req.body.driverId !== req.driverId) {
        return res.status(403).json({ message: "Cannot create schedule for another driver" });
      }
      
      const newSchedule = await storage.createDriverAvailabilitySchedule(req.body);
      res.status(201).json(newSchedule);
    } catch (error) {
      console.error("Error creating driver availability schedule:", error);
      console.error("Error details:", error instanceof Error ? error.message : error);
      res.status(500).json({ message: "Server error creating schedule" });
    }
  }
);

// PUT /api/driver/availability/:id
router.put(
  "/availability/:id",
  isAuthenticated,
  hasRole('driver'),
  getDriverId,
  injectDriverId,
  validate(insertDriverAvailabilityScheduleSchema),
  async (req: Request, res: Response) => {
    try {
      if (!req.driverId) {
        return res.status(400).json({ message: "Missing driver ID" });
      }
      
      const scheduleId = parseInt(req.params.id);
      const existingSchedule = await storage.getDriverAvailabilitySchedule(scheduleId);
      
      if (!existingSchedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      
      // Check if schedule belongs to the authenticated driver
      if (existingSchedule.driverId !== req.driverId) {
        return res.status(403).json({ message: "Unauthorized to update this schedule" });
      }
      
      // Update the schedule
      const updatedSchedule = await storage.updateDriverAvailabilitySchedule(scheduleId, req.body);
      
      if (!updatedSchedule) {
        return res.status(500).json({ message: "Failed to update schedule" });
      }
      
      res.json(updatedSchedule);
    } catch (error) {
      console.error("Error updating driver availability schedule:", error);
      res.status(500).json({ message: "Server error updating schedule" });
    }
  }
);

// DELETE /api/driver/availability/:id
router.delete(
  "/availability/:id",
  isAuthenticated,
  hasRole('driver'),
  getDriverId,
  async (req: Request, res: Response) => {
    try {
      if (!req.driverId) {
        return res.status(400).json({ message: "Missing driver ID" });
      }
      
      const scheduleId = parseInt(req.params.id);
      const existingSchedule = await storage.getDriverAvailabilitySchedule(scheduleId);
      
      if (!existingSchedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      
      // Check if schedule belongs to the authenticated driver
      if (existingSchedule.driverId !== req.driverId) {
        return res.status(403).json({ message: "Unauthorized to delete this schedule" });
      }
      
      // Delete the schedule
      const success = await storage.deleteDriverAvailabilitySchedule(scheduleId);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to delete schedule" });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting driver availability schedule:", error);
      res.status(500).json({ message: "Server error deleting schedule" });
    }
  }
);

// Driver blocked time routes
// GET /api/driver/blocked-times
router.get("/blocked-times", isAuthenticated, hasRole('driver'), getDriverId, async (req: Request, res: Response) => {
  try {
    if (!req.driverId) {
      return res.status(400).json({ message: "Missing driver ID" });
    }
    
    const blockedTimes = await storage.getDriverBlockedTimes(req.driverId);
    res.json(blockedTimes);
  } catch (error) {
    console.error("Error fetching driver blocked times:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/driver/blocked-times/daterange?start=&end=
router.get("/blocked-times/daterange", isAuthenticated, hasRole('driver'), getDriverId, async (req: Request, res: Response) => {
  try {
    if (!req.driverId) {
      return res.status(400).json({ message: "Missing driver ID" });
    }
    
    const startDate = req.query.start ? new Date(req.query.start as string) : new Date();
    const endDate = req.query.end ? new Date(req.query.end as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default to 30 days from now
    
    // Validate date objects
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }
    
    const blockedTimes = await storage.getDriverBlockedTimesByDateRange(req.driverId, startDate, endDate);
    res.json(blockedTimes);
  } catch (error) {
    console.error("Error fetching driver blocked times by date range:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/driver/blocked-times/:id
router.get("/blocked-times/:id", isAuthenticated, hasRole('driver'), getDriverId, async (req: Request, res: Response) => {
  try {
    if (!req.driverId) {
      return res.status(400).json({ message: "Missing driver ID" });
    }
    
    const blockedTime = await storage.getDriverBlockedTime(parseInt(req.params.id));
    
    if (!blockedTime) {
      return res.status(404).json({ message: "Blocked time not found" });
    }
    
    // Check if blocked time belongs to the authenticated driver
    if (blockedTime.driverId !== req.driverId) {
      return res.status(403).json({ message: "Unauthorized access to this blocked time" });
    }
    
    res.json(blockedTime);
  } catch (error) {
    console.error("Error fetching driver blocked time:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/driver/blocked-times
router.post(
  "/blocked-times",
  isAuthenticated,
  hasRole('driver'),
  getDriverId,
  validate(insertDriverBlockedTimeSchema),
  async (req: Request, res: Response) => {
    try {
      if (!req.driverId) {
        return res.status(400).json({ message: "Missing driver ID" });
      }
      
      // Ensure the driver ID in the body matches the authenticated driver
      if (req.body.driverId && req.body.driverId !== req.driverId) {
        return res.status(403).json({ message: "Cannot create blocked time for another driver" });
      }
      
      // Set the driver ID from the authenticated user
      req.body.driverId = req.driverId;
      
      const newBlockedTime = await storage.createDriverBlockedTime(req.body);
      res.status(201).json(newBlockedTime);
    } catch (error) {
      console.error("Error creating driver blocked time:", error);
      res.status(500).json({ message: "Server error creating blocked time" });
    }
  }
);

// PUT /api/driver/blocked-times/:id
router.put(
  "/blocked-times/:id",
  isAuthenticated,
  hasRole('driver'),
  getDriverId,
  async (req: Request, res: Response) => {
    try {
      if (!req.driverId) {
        return res.status(400).json({ message: "Missing driver ID" });
      }
      
      const blockedTimeId = parseInt(req.params.id);
      const existingBlockedTime = await storage.getDriverBlockedTime(blockedTimeId);
      
      if (!existingBlockedTime) {
        return res.status(404).json({ message: "Blocked time not found" });
      }
      
      // Check if blocked time belongs to the authenticated driver
      if (existingBlockedTime.driverId !== req.driverId) {
        return res.status(403).json({ message: "Unauthorized to update this blocked time" });
      }
      
      // Update the blocked time
      const updatedBlockedTime = await storage.updateDriverBlockedTime(blockedTimeId, req.body);
      
      if (!updatedBlockedTime) {
        return res.status(500).json({ message: "Failed to update blocked time" });
      }
      
      res.json(updatedBlockedTime);
    } catch (error) {
      console.error("Error updating driver blocked time:", error);
      res.status(500).json({ message: "Server error updating blocked time" });
    }
  }
);

// DELETE /api/driver/blocked-times/:id
router.delete(
  "/blocked-times/:id",
  isAuthenticated,
  hasRole('driver'),
  getDriverId,
  async (req: Request, res: Response) => {
    try {
      if (!req.driverId) {
        return res.status(400).json({ message: "Missing driver ID" });
      }
      
      const blockedTimeId = parseInt(req.params.id);
      const existingBlockedTime = await storage.getDriverBlockedTime(blockedTimeId);
      
      if (!existingBlockedTime) {
        return res.status(404).json({ message: "Blocked time not found" });
      }
      
      // Check if blocked time belongs to the authenticated driver
      if (existingBlockedTime.driverId !== req.driverId) {
        return res.status(403).json({ message: "Unauthorized to delete this blocked time" });
      }
      
      // Delete the blocked time
      const success = await storage.deleteDriverBlockedTime(blockedTimeId);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to delete blocked time" });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting driver blocked time:", error);
      res.status(500).json({ message: "Server error deleting blocked time" });
    }
  }
);

export default router;
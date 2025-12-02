import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { insertRecurringAppointmentSchema } from "@shared/schema";

const router = Router();

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// GET recurring appointments for the current user
router.get("/", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const appointments = await storage.getRecurringAppointmentsByUser(userId);
    res.json(appointments);
  } catch (error) {
    console.error("Error fetching recurring appointments:", error);
    res.status(500).json({ message: "Error fetching recurring appointments" });
  }
});

// GET specific recurring appointment by ID
router.get("/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const appointmentId = parseInt(req.params.id);
    const appointment = await storage.getRecurringAppointment(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({ message: "Recurring appointment not found" });
    }
    
    // Security check - only allow users to see their own appointments
    if (appointment.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    res.json(appointment);
  } catch (error) {
    console.error("Error fetching recurring appointment:", error);
    res.status(500).json({ message: "Error fetching recurring appointment" });
  }
});

// CREATE new recurring appointment
router.post("/", isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Ensure the user is a rider
    if (req.user!.role !== 'rider') {
      return res.status(403).json({ message: "Only riders can create recurring appointments" });
    }
    
    // Validate the request body
    const validationResult = insertRecurringAppointmentSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "Invalid appointment data", 
        errors: validationResult.error.errors 
      });
    }
    
    // Ensure appointment is assigned to the current user
    const appointmentData = {
      ...validationResult.data,
      userId: req.user!.id
    };
    
    // Create the recurring appointment
    const appointment = await storage.createRecurringAppointment(appointmentData);
    
    res.status(201).json(appointment);
  } catch (error) {
    console.error("Error creating recurring appointment:", error);
    res.status(500).json({ message: "Error creating recurring appointment" });
  }
});

// UPDATE recurring appointment
router.put("/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const appointmentId = parseInt(req.params.id);
    const existing = await storage.getRecurringAppointment(appointmentId);
    
    if (!existing) {
      return res.status(404).json({ message: "Recurring appointment not found" });
    }
    
    // Security check - only allow users to update their own appointments
    if (existing.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // Remove fields that shouldn't be updated directly
    const { id, userId, createdAt, ...validUpdateFields } = req.body;
    
    // Update the appointment
    const updated = await storage.updateRecurringAppointment(appointmentId, validUpdateFields);
    
    res.json(updated);
  } catch (error) {
    console.error("Error updating recurring appointment:", error);
    res.status(500).json({ message: "Error updating recurring appointment" });
  }
});

// DELETE recurring appointment
router.delete("/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const appointmentId = parseInt(req.params.id);
    const existing = await storage.getRecurringAppointment(appointmentId);
    
    if (!existing) {
      return res.status(404).json({ message: "Recurring appointment not found" });
    }
    
    // Security check - only allow users to delete their own appointments
    if (existing.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // Delete the appointment
    await storage.deleteRecurringAppointment(appointmentId);
    
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting recurring appointment:", error);
    res.status(500).json({ message: "Error deleting recurring appointment" });
  }
});

// Generate rides from a recurring appointment for a date range
router.post("/:id/generate-rides", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const appointmentId = parseInt(req.params.id);
    const appointment = await storage.getRecurringAppointment(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({ message: "Recurring appointment not found" });
    }
    
    // Security check - only allow users to generate rides from their own appointments
    if (appointment.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // Validate the request body
    const schema = z.object({
      startDate: z.string().or(z.date()),
      endDate: z.string().or(z.date())
    });
    
    const validationResult = schema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "Invalid date range", 
        errors: validationResult.error.errors 
      });
    }
    
    // Parse dates
    const startDate = new Date(validationResult.data.startDate);
    const endDate = new Date(validationResult.data.endDate);
    
    // Generate rides
    const rides = await storage.generateRidesFromAppointment(appointmentId, startDate, endDate);
    
    res.status(201).json({
      message: `Successfully generated ${rides.length} rides`,
      rides
    });
  } catch (error) {
    console.error("Error generating rides from recurring appointment:", error);
    res.status(500).json({ message: "Error generating rides from recurring appointment" });
  }
});

export default router;
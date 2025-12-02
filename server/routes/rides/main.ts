import { Router } from 'express';
import type { Request, Response } from 'express';
import { storage } from '../../storage';
import { optimizedStorage } from '../../performance-optimizations';
import { isAuthenticated, hasRole } from '../../middleware/auth';
import { requireLegalAgreements } from '../../middleware/legal-agreement-middleware';
import { insertRideSchema, type InsertRide } from '../../../shared/schema';
import { automaticPaymentService } from '../../automatic-payment-service';
import { notificationService } from '../../notifications';
import { z } from 'zod';

const router = Router();

// Debug route registration
console.log('🚀 ROUTES: Registering DELETE route for /rides/:id');

router.use((req, res, next) => {
  if (req.method === 'DELETE' && req.path.includes('/rides/')) {
    console.log(`🎯 DELETE ROUTE HIT: ${req.method} ${req.path}`);
  }
  next();
});

// Create a new ride
router.post('/rides', isAuthenticated, hasRole('rider'), requireLegalAgreements, async (req: Request, res: Response) => {
  try {
    const riderId = req.user!.id;
    console.log("Creating ride with data:", JSON.stringify(req.body, null, 2));
    
    try {
      // Validate request body
      const rideData = insertRideSchema.parse({
        ...req.body,
        riderId: riderId,
        status: 'requested',
        createdAt: new Date().toISOString(),
        isRecurring: req.body.isRecurring || false,
        scheduledFor: req.body.scheduledFor || null,
        recurringDays: req.body.recurringDays || null,
        recurringEndDate: req.body.recurringEndDate || null,
        lastRecurringRide: req.body.lastRecurringRide || null,
      });

      console.log("Validated ride data:", JSON.stringify(rideData, null, 2));

      // Create the ride
      const ride = await storage.createRide(rideData);
      console.log("Created ride:", JSON.stringify(ride, null, 2));

      // Check if this is an urgent ride and send notifications to drivers
      if (rideData.isUrgent === true) {
        try {
          // Get active drivers to notify about urgent ride
          const activeDrivers = await storage.getActiveDrivers();
          const riderDetails = await storage.getUserById(riderId);
          
          for (const driver of activeDrivers) {
            try {
              await notificationService.createAndSendNotification({
                userId: driver.id,
                type: 'URGENT_RIDE_POSTED' as any,
                title: '🚨 Urgent Ride Available',
                message: `New urgent ride posted! ${ride.pickupLocation} to ${ride.dropoffLocation}. Scheduled for ${new Date(ride.scheduledTime).toLocaleString()}. Respond quickly!`,
                link: `/driver/rides/${ride.id}/bid`,
                metadata: {
                  rideId: ride.id,
                  pickupLocation: ride.pickupLocation,
                  dropoffLocation: ride.dropoffLocation,
                  scheduledTime: ride.scheduledTime,
                  urgentCancellationFee: ride.urgentCancellationFee,
                  riderName: riderDetails?.username || 'Rider'
                }
              });
            } catch (notificationError) {
              console.error(`Failed to send urgent ride notification to driver ${driver.id}:`, notificationError);
            }
          }
          
          console.log(`🚨 Sent urgent ride notifications to ${activeDrivers.length} drivers for ride ${ride.id}`);
        } catch (error) {
          console.error('Error sending urgent ride notifications:', error);
        }
      }

      // Updated onboarding progress for first-time riders
      try {
        const onboardingProgress = await storage.getRiderOnboardingProgress(riderId);
        if (onboardingProgress && !onboardingProgress.isFirstRide) {
          await storage.updateRiderOnboardingProgress(riderId, { 
            isFirstRide: true
          });
        }
      } catch (err) {
        // Don't fail ride creation if updating onboarding progress fails
        console.error("Error updating onboarding progress:", err);
      }

      res.status(201).json(ride);
    } catch (parseError) {
      console.error("Ride data validation error:", parseError);
      res.status(400).json({ 
        message: "Invalid ride data", 
        details: parseError instanceof Error ? parseError.message : String(parseError) 
      });
    }
  } catch (error) {
    console.error("Ride creation error:", error);
    res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
  }
});

// Get rides for current user
router.get('/rides', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    
    // Use optimized query to improve performance from 1+ seconds to <200ms
    const rides = await optimizedStorage.getRidesForUser(user.id, user.role, 20);
    
    res.json(rides);
  } catch (error) {
    console.error("Error fetching rides:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get specific ride by ID
router.get('/rides/:id', isAuthenticated, requireLegalAgreements, async (req: Request, res: Response) => {
  try {
    const rideId = parseInt(req.params.id);
    const ride = await storage.getRide(rideId);
    
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }
    
    // Check permissions - expanded to allow drivers to view rides they can bid on or have bid on
    const user = req.user!;
    const isAdmin = user.role === "admin";
    const isRideOwner = ride.riderId === user.id;
    const isAssignedDriver = ride.driverId === user.id;
    const isDriverViewingAvailableRide = user.role === "driver" && !ride.driverId && ["requested", "bidding"].includes(ride.status);
    
    // Allow drivers to view rides they have submitted bids for
    let isDriverWithBid = false;
    if (user.role === "driver") {
      try {
        const driverBids = await storage.getBidsByDriver(user.id);
        isDriverWithBid = driverBids.some(bid => bid.rideId === rideId);
      } catch (error) {
        console.error("Error checking driver bids:", error);
        isDriverWithBid = false;
      }
    }
    
    if (!isAdmin && !isRideOwner && !isAssignedDriver && !isDriverViewingAvailableRide && !isDriverWithBid) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    res.json(ride);
  } catch (error) {
    console.error("Error fetching ride:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update ride status
router.patch('/rides/:id/status', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const rideId = parseInt(req.params.id);
    const { status } = req.body;
    
    const ride = await storage.getRide(rideId);
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }
    
    // Check permissions
    const user = req.user!;
    if (user.role !== "admin" && ride.riderId !== user.id && ride.driverId !== user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    const updatedRide = await storage.updateRideStatus(rideId, status);
    res.json(updatedRide);
  } catch (error) {
    console.error("Error updating ride status:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete/Cancel ride route - only riders who created the ride or admins can delete rides
router.delete('/rides/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const rideId = parseInt(req.params.id);
    const ride = await storage.getRide(rideId);

    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    // Check permissions - only allow:
    // 1. Admin users
    // 2. The rider who created the ride
    const user = req.user!;
    const canDelete = 
      user.role === "admin" || 
      ride.riderId === user.id;

    if (!canDelete) {
      return res.status(403).json({ message: "Forbidden - Only the rider who created this ride or an admin can delete it" });
    }

    // Only allow deletion for rides in 'requested', 'bidding', 'scheduled', 'accepted', or 'payment_pending' status
    if (!["requested", "bidding", "scheduled", "accepted", "payment_pending"].includes(ride.status)) {
      return res.status(400).json({ 
        message: "Cannot delete a ride that is in progress or completed"
      });
    }

    // Check if this is a late cancellation (within 24 hours of scheduled time) for scheduled/accepted/payment_pending rides
    let isLateCancellation = false;
    if (["scheduled", "accepted", "payment_pending"].includes(ride.status)) {
      const scheduledTime = new Date(ride.scheduledTime);
      const now = new Date();
      const timeDiffMs = scheduledTime.getTime() - now.getTime();
      const hoursBeforeRide = timeDiffMs / (1000 * 60 * 60);

      isLateCancellation = hoursBeforeRide < 24;
    }

    // Consider who is cancelling the ride (rider or driver)
    const userRole = req.user!.role;
    let cancellationMessage = "Ride successfully deleted";

    if (ride.status === "scheduled" && isLateCancellation) {
      if (userRole === "rider") {
        cancellationMessage = "Ride cancelled. A $25 late cancellation fee may apply as you cancelled within 24 hours of the scheduled time.";
      } else if (userRole === "driver") {
        cancellationMessage = "Ride cancelled. Please note that cancelling rides within 24 hours of the scheduled time will affect your driver rating and available ride opportunities.";
      }
    }

    // Send notification to the counterparty if this is a scheduled ride
    if (ride.status === "scheduled") {
      // Only send notifications for rides that have been matched with a driver
      if (ride.driverId) {
        // Send cancellation notification
        await notificationService.sendRideCancellationNotification(
          ride,
          req.user!,
          isLateCancellation ? "Cancelled within 24 hours of scheduled time." : undefined
        );
      }
    }

    const success = await storage.deleteRide(rideId);

    if (success) {
      res.status(200).json({ 
        message: cancellationMessage,
        isLateCancellation: isLateCancellation
      });
    } else {
      res.status(500).json({ message: "Failed to delete ride" });
    }
  } catch (error) {
    console.error("Error deleting ride:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a ride edit request (rider-only)
router.post('/rides/:rideId/edit', isAuthenticated, hasRole("rider"), async (req: Request, res: Response) => {
  try {
    console.log("Starting ride edit request with body:", JSON.stringify(req.body, null, 2));
    
    const rideId = parseInt(req.params.rideId);
    const userId = req.user!.id;
    
    // Validate the ride exists and belongs to the user
    const ride = await storage.getRide(rideId);
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }
    
    if (ride.riderId !== userId) {
      return res.status(403).json({ message: "You can only edit your own rides" });
    }
    
    // Check if the ride is in an editable state
    const editableStatuses = ['pending', 'driver_assigned', 'payment_pending'];
    if (!editableStatuses.includes(ride.status)) {
      return res.status(400).json({ 
        message: "Cannot edit ride in current status",
        currentStatus: ride.status
      });
    }
    
    // Create the edit request
    const editRequest = await storage.createRideEdit({
      rideId: rideId,
      requestedById: userId,
      originalData: {
        pickupLocation: ride.pickupLocation,
        dropoffLocation: ride.dropoffLocation,
        scheduledTime: ride.scheduledTime,
        specialInstructions: ride.specialInstructions || null
      },
      proposedData: req.body as any,
      status: 'pending'
    });
    
    console.log("Created edit request:", JSON.stringify(editRequest, null, 2));
    
    res.status(201).json({
      success: true,
      message: "Edit request created successfully",
      editRequest: editRequest
    });
  } catch (error) {
    console.error("Error creating ride edit request:", error);
    res.status(500).json({ 
      message: "Server error",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
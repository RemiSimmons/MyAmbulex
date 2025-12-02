import { Router } from 'express';
import { emailNotificationService } from '../email-notification-service';
import { isAuthenticated, hasRole } from '../middleware/auth';
import { storage } from '../storage';

const router = Router();

// Send test email (admin only)
router.post('/test', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    const { email, templateId, variables } = req.body;
    
    if (!email || !templateId) {
      return res.status(400).json({ 
        message: 'Email and templateId are required' 
      });
    }

    // Send test email
    const result = await emailNotificationService.sendAdministrativeEmail(
      req.user!.id,
      email,
      'Test User',
      'Test Email',
      'This is a test email from MyAmbulex notification system.',
      'normal'
    );

    res.json({ 
      success: result,
      message: result ? 'Test email sent successfully' : 'Failed to send test email'
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ message: 'Failed to send test email' });
  }
});

// Send driver verification email
router.post('/driver-verification', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    const { driverId, verificationToken } = req.body;
    
    if (!driverId || !verificationToken) {
      return res.status(400).json({ 
        message: 'driverId and verificationToken are required' 
      });
    }

    const driver = await storage.getUser(driverId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const result = await emailNotificationService.sendDriverVerificationEmail(
      driver.id,
      driver.email,
      driver.fullName || driver.username,
      verificationToken
    );

    res.json({ 
      success: result,
      message: result ? 'Verification email sent' : 'Failed to send verification email'
    });
  } catch (error) {
    console.error('Error sending driver verification email:', error);
    res.status(500).json({ message: 'Failed to send verification email' });
  }
});

// Send booking confirmation
router.post('/booking-confirmation', isAuthenticated, async (req, res) => {
  try {
    const { rideId } = req.body;
    const userId = req.user!.id;
    
    if (!rideId) {
      return res.status(400).json({ message: 'rideId is required' });
    }

    const ride = await storage.getRide(rideId);
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    // Verify user has access to this ride
    if (ride.riderId !== userId && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const rider = await storage.getUser(ride.riderId);
    if (!rider) {
      return res.status(404).json({ message: 'Rider not found' });
    }

    // Get driver info if assigned
    let driverName = 'Assigned driver';
    let vehicleInfo = 'Vehicle details will be provided';
    
    if (ride.driverId) {
      const driver = await storage.getUser(ride.driverId);
      const driverDetails = await storage.getDriverDetails(ride.driverId);
      const vehicles = await storage.getVehiclesByDriver(ride.driverId);
      
      if (driver) {
        driverName = driver.fullName || driver.username;
      }
      
      if (vehicles && vehicles.length > 0) {
        const vehicle = vehicles[0];
        vehicleInfo = `${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.color})`;
      }
    }

    const result = await emailNotificationService.sendBookingConfirmation(
      rider.id,
      rider.email,
      rider.fullName || rider.username,
      {
        rideId: ride.id,
        referenceNumber: ride.referenceNumber,
        pickupAddress: ride.pickupAddress,
        dropoffAddress: ride.dropoffAddress,
        scheduledTime: ride.scheduledTime,
        estimatedFare: ride.estimatedPrice || 0,
        driverName,
        vehicleInfo
      }
    );

    res.json({ 
      success: result,
      message: result ? 'Booking confirmation sent' : 'Failed to send booking confirmation'
    });
  } catch (error) {
    console.error('Error sending booking confirmation:', error);
    res.status(500).json({ message: 'Failed to send booking confirmation' });
  }
});

// Send ride status update
router.post('/ride-status-update', isAuthenticated, async (req, res) => {
  try {
    const { rideId, status, statusMessage, estimatedArrival } = req.body;
    const userId = req.user!.id;
    
    if (!rideId || !status || !statusMessage) {
      return res.status(400).json({ 
        message: 'rideId, status, and statusMessage are required' 
      });
    }

    const ride = await storage.getRide(rideId);
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    // Verify user has access to this ride (rider, driver, or admin)
    if (ride.riderId !== userId && ride.driverId !== userId && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const rider = await storage.getUser(ride.riderId);
    if (!rider) {
      return res.status(404).json({ message: 'Rider not found' });
    }

    const result = await emailNotificationService.sendRideStatusUpdate(
      rider.id,
      rider.email,
      rider.fullName || rider.username,
      {
        rideId: ride.id,
        referenceNumber: ride.referenceNumber,
        status,
        statusMessage,
        estimatedArrival
      }
    );

    res.json({ 
      success: result,
      message: result ? 'Status update sent' : 'Failed to send status update'
    });
  } catch (error) {
    console.error('Error sending ride status update:', error);
    res.status(500).json({ message: 'Failed to send status update' });
  }
});

// Send document expiry warning
router.post('/document-expiry-warning', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    const { driverId, expiringDocuments } = req.body;
    
    if (!driverId || !expiringDocuments || !Array.isArray(expiringDocuments)) {
      return res.status(400).json({ 
        message: 'driverId and expiringDocuments array are required' 
      });
    }

    const driver = await storage.getUser(driverId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const result = await emailNotificationService.sendDocumentExpiryWarning(
      driver.id,
      driver.email,
      driver.fullName || driver.username,
      expiringDocuments
    );

    res.json({ 
      success: result,
      message: result ? 'Expiry warning sent' : 'Failed to send expiry warning'
    });
  } catch (error) {
    console.error('Error sending document expiry warning:', error);
    res.status(500).json({ message: 'Failed to send expiry warning' });
  }
});

// Send administrative email
router.post('/administrative', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    const { userId, subject, message, priority = 'normal' } = req.body;
    
    if (!userId || !subject || !message) {
      return res.status(400).json({ 
        message: 'userId, subject, and message are required' 
      });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const result = await emailNotificationService.sendAdministrativeEmail(
      user.id,
      user.email,
      user.fullName || user.username,
      subject,
      message,
      priority
    );

    res.json({ 
      success: result,
      message: result ? 'Administrative email sent' : 'Failed to send administrative email'
    });
  } catch (error) {
    console.error('Error sending administrative email:', error);
    res.status(500).json({ message: 'Failed to send administrative email' });
  }
});

// Get notification history for user
router.get('/history', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const history = emailNotificationService.getNotificationHistory(userId);
    
    res.json(history);
  } catch (error) {
    console.error('Error fetching notification history:', error);
    res.status(500).json({ message: 'Failed to fetch notification history' });
  }
});

// Get notification statistics (admin only)
router.get('/stats', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    const stats = emailNotificationService.getNotificationStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ message: 'Failed to fetch notification stats' });
  }
});

// Webhook endpoint for SendGrid events
router.post('/webhook/sendgrid', async (req, res) => {
  try {
    const events = req.body;
    
    if (!Array.isArray(events)) {
      return res.status(400).json({ message: 'Invalid webhook payload' });
    }

    for (const event of events) {
      console.log('SendGrid webhook event:', {
        event: event.event,
        email: event.email,
        timestamp: event.timestamp,
        notification_id: event.notification_id,
        user_id: event.user_id
      });

      // Update notification status based on webhook event
      // This would update the notification status in your database
      // For now, we'll just log the events
    }

    res.status(200).json({ message: 'Webhook processed' });
  } catch (error) {
    console.error('Error processing SendGrid webhook:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
});

// Bulk send notifications (admin only)
router.post('/bulk-send', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    const { userIds, templateId, subject, message, priority = 'normal' } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || !subject || !message) {
      return res.status(400).json({ 
        message: 'userIds array, subject, and message are required' 
      });
    }

    const results = [];
    
    for (const userId of userIds) {
      try {
        const user = await storage.getUser(userId);
        if (user) {
          const result = await emailNotificationService.sendAdministrativeEmail(
            user.id,
            user.email,
            user.fullName || user.username,
            subject,
            message,
            priority
          );
          
          results.push({ userId, email: user.email, success: result });
        } else {
          results.push({ userId, email: null, success: false, error: 'User not found' });
        }
      } catch (error) {
        results.push({ 
          userId, 
          email: null, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    res.json({
      message: `Bulk send completed: ${successCount} successful, ${failureCount} failed`,
      results,
      summary: { successCount, failureCount, total: results.length }
    });
  } catch (error) {
    console.error('Error in bulk send:', error);
    res.status(500).json({ message: 'Failed to process bulk send' });
  }
});

export default router;
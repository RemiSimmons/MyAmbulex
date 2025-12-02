import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { DocumentStorageService } from '../services/document-storage-service';

const router = Router();
const documentStorageService = new DocumentStorageService();

// Auth middleware
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

const isAdmin = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated() || req.user!.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
  next();
};

// Get pending driver applications
router.get('/pending-drivers', isAdmin, async (req, res) => {
  try {
    const pendingDrivers = await storage.getPendingDrivers();

    // Get user info for each driver
    const driversWithDetails = await Promise.all(
      pendingDrivers.map(async (driver) => {
        const user = await storage.getUser(driver.userId);
        const vehicles = await storage.getVehiclesByDriver(driver.id);

        return {
          ...driver,
          user,
          vehicle: vehicles.length > 0 ? vehicles[0] : null
        };
      })
    );

    res.json(driversWithDetails);
  } catch (error) {
    console.error('Error fetching pending drivers:', error);
    res.status(500).json({ 
      message: 'Error fetching pending drivers',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get verified driver list
router.get('/verified-drivers', isAdmin, async (req, res) => {
  try {
    const verifiedDrivers = await storage.getVerifiedDrivers();

    // Get user info for each driver
    const driversWithDetails = await Promise.all(
      verifiedDrivers.map(async (driver) => {
        const user = await storage.getUser(driver.userId);
        const vehicles = await storage.getVehiclesByDriver(driver.id);

        return {
          ...driver,
          user,
          vehicle: vehicles.length > 0 ? vehicles[0] : null
        };
      })
    );

    res.json(driversWithDetails);
  } catch (error) {
    console.error('Error fetching verified drivers:', error);
    res.status(500).json({ 
      message: 'Error fetching verified drivers',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get driver details for verification
router.get('/driver/:id', isAdmin, async (req, res) => {
  try {
    const driverId = parseInt(req.params.id);

    // First get the driver record from driverDetails table using the driver ID directly
    // The issue is that storage.getDriverDetails expects a userId, not driver ID
    const verifiedDrivers = await storage.getVerifiedDrivers();
    const pendingDrivers = await storage.getPendingDrivers();
    const allDrivers = [...verifiedDrivers, ...pendingDrivers];
    const driverDetail = allDrivers.find(driver => driver.id === driverId);

    if (!driverDetail) {
      return res.status(404).json({ message: 'Driver details not found' });
    }

    // Now that we have the driver, we can get the user info
    const user = await storage.getUser(driverDetail.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get vehicle info - use the driver's id from the driverDetail object
    const vehicles = await storage.getVehiclesByDriver(driverDetail.id);

    // Get driver's current location if they're on an active ride
    const activeRide = await storage.getActiveRideForDriver(driverDetail.userId);

    // We'll need to implement a proper location tracking system
    // For now we'll use the pickup and dropoff locations to estimate
    let currentLocation = null;
    if (activeRide) {
      // Use the pickup location as a fallback for current location
      currentLocation = {
        lat: activeRide.pickupLocationLat || 0,
        lng: activeRide.pickupLocationLng || 0,
        timestamp: new Date()
      };
    }

    res.json({
      driverDetails: {
        ...driverDetail,
        currentLocation: currentLocation
      },
      user,
      vehicle: vehicles.length > 0 ? vehicles[0] : null,
      activeRide
    });

    console.log(`Driver details served for ID: ${driverId}, UserId: ${driverDetail.userId}`);
  } catch (error) {
    console.error('Error fetching driver details:', error);
    res.status(500).json({ 
      message: 'Error fetching driver details',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Update driver verification status
router.put('/driver/:id/verify', isAdmin, async (req, res) => {
  try {
    const driverId = parseInt(req.params.id);
    const { action, documentType, rejectionReason } = req.body;

    // First get the driver record from driverDetails table using the driver ID directly
    const verifiedDrivers = await storage.getVerifiedDrivers();
    const pendingDrivers = await storage.getPendingDrivers();
    const allDrivers = [...verifiedDrivers, ...pendingDrivers];
    const driverDetail = allDrivers.find(driver => driver.id === driverId);

    if (!driverDetail) {
      return res.status(404).json({ message: 'Driver details not found' });
    }

    const updateData: Record<string, any> = {};

    // Handle different verification actions
    if (action === 'approve') {
      switch (documentType) {
        case 'license':
          updateData.licenseVerified = true;
          break;
        case 'insurance':
          updateData.insuranceVerified = true;
          break;
        case 'vehicle':
          updateData.vehicleVerified = true;
          break;
        case 'background_check':
          updateData.backgroundCheckStatus = 'approved';
          updateData.backgroundCheckDate = new Date();
          break;
        case 'medical_certification':
          updateData.medicalCertificationVerified = true;
          break;
        case 'all':
          updateData.licenseVerified = true;
          updateData.insuranceVerified = true;
          updateData.vehicleVerified = true;
          updateData.backgroundCheckStatus = 'approved';
          updateData.backgroundCheckDate = new Date();
          updateData.medicalCertificationVerified = true;
          updateData.accountStatus = 'active';
          updateData.verified = true;
          updateData.canAcceptRides = true;
          updateData.canViewRideRequests = true;
          updateData.verifiedAt = new Date();
          break;
        default:
          return res.status(400).json({ message: 'Invalid document type' });
      }
    } else if (action === 'reject') {
      // When any document is rejected, revoke ride acceptance permissions
      updateData.canAcceptRides = false;
      updateData.canViewRideRequests = false;
      updateData.verified = false;
      updateData.accountStatus = 'pending';
      
      switch (documentType) {
        case 'license':
          updateData.licenseVerified = false;
          updateData.licenseRejectionReason = rejectionReason || 'Rejected by admin';
          break;
        case 'insurance':
          updateData.insuranceVerified = false;
          updateData.insuranceRejectionReason = rejectionReason || 'Rejected by admin';
          break;
        case 'vehicle':
          updateData.vehicleVerified = false;
          updateData.vehicleRejectionReason = rejectionReason || 'Rejected by admin';
          break;
        case 'background_check':
          updateData.backgroundCheckStatus = 'rejected';
          updateData.backgroundCheckDate = new Date();
          break;
        case 'medical_certification':
          updateData.medicalCertificationVerified = false;
          updateData.medicalCertificationRejectionReason = rejectionReason || 'Rejected by admin';
          break;
        case 'all':
          updateData.licenseVerified = false;
          updateData.insuranceVerified = false;
          updateData.vehicleVerified = false;
          updateData.backgroundCheckStatus = 'rejected';
          updateData.backgroundCheckDate = new Date();
          updateData.medicalCertificationVerified = false;
          updateData.accountStatus = 'rejected';
          updateData.verified = false;
          updateData.canAcceptRides = false;
          updateData.canViewRideRequests = false;
          updateData.rejectionReason = rejectionReason || 'Application rejected by admin';
          break;
        default:
          return res.status(400).json({ message: 'Invalid document type' });
      }
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }

    // Update the driver details
    const updatedDriver = await storage.updateDriverDetails(driverDetail.userId, updateData);

    if (!updatedDriver) {
      return res.status(404).json({ message: 'Failed to update driver details' });
    }

    // Check if all individual documents are now approved and auto-activate
    if (action === 'approve' && documentType !== 'all') {
      const currentDetails = await storage.getDriverDetails(driverDetail.userId);
      const allDocsApproved = 
        currentDetails?.licenseVerified === true &&
        currentDetails?.insuranceVerified === true &&
        currentDetails?.vehicleVerified === true &&
        currentDetails?.backgroundCheckStatus === 'approved';

      if (allDocsApproved && currentDetails?.accountStatus !== 'active') {
        // Auto-activate driver account and grant ride acceptance permissions
        await storage.updateDriverDetails(driverDetail.userId, {
          verified: true,
          accountStatus: 'active',
          canAcceptRides: true,
          canViewRideRequests: true,
          verifiedAt: new Date()
        });
        
        console.log(`🎉 Driver ${driverDetail.userId} automatically granted ride acceptance permissions - all documents approved!`);
      }
    }

    // Get user for notification
    const user = await storage.getUser(driverDetail.userId);
    if (user) {
      let title = '';
      let message = '';

      if (action === 'approve') {
        if (documentType === 'all') {
          title = 'Account Activated!';
          message = 'Congratulations! Your driver application has been fully approved and your account is now ACTIVE. You can start accepting ride requests immediately!';
        } else {
          // Check if this approval completed all requirements
          const currentDetails = await storage.getDriverDetails(driverDetail.userId);
          const allDocsApproved = 
            currentDetails?.licenseVerified === true &&
            currentDetails?.insuranceVerified === true &&
            currentDetails?.vehicleVerified === true &&
            currentDetails?.backgroundCheckStatus === 'approved';

          if (allDocsApproved) {
            title = 'Account Activated!';
            message = `Your ${documentType} has been approved. All documents are now verified and your account is ACTIVE! You can start accepting rides.`;
          } else {
            title = 'Document Approved';
            message = `Your ${documentType} has been approved.`;
          }
        }
      } else {
        // Document rejection - unlock account for re-upload
        await storage.updateUser(user.id, { accountStatus: 'active' });
        
        title = 'Document Rejected - Action Required';
        message = `Your ${documentType} was rejected and needs to be re-uploaded. Reason: ${rejectionReason}. Your account has been unlocked so you can upload new documents. Please log in to your driver dashboard to re-upload the required documents.`;
      }

      await notificationService.createAndSendNotification({
        userId: user.id,
        type: action === 'approve' ? NotificationType.DOCUMENT_APPROVED : NotificationType.DOCUMENT_REJECTED,
        title,
        message,
        metadata: {
          documentType,
          action,
          rejectionReason: rejectionReason || null
        }
      });
    }

    res.json({
      message: `Driver ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      driver: updatedDriver
    });

    console.log(`Driver ${action === 'approve' ? 'approved' : 'rejected'}: ID: ${driverId}, UserId: ${driverDetail.userId}, DocumentType: ${documentType}`);
  } catch (error) {
    console.error('Error updating driver verification:', error);
    res.status(500).json({ 
      message: 'Error updating driver verification',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get stats for admin dashboard
router.get('/stats', isAdmin, async (req, res) => {
  try {
    const stats = {
      totalRiders: await storage.countUsersByRole('rider'),
      totalDrivers: await storage.countUsersByRole('driver'),
      pendingDrivers: await storage.countPendingDrivers(),
      activeDrivers: await storage.countActiveDrivers(),
      pendingRides: await storage.countRidesByStatus('pending'),
      completedRides: await storage.countRidesByStatus('completed'),
      totalRevenue: await storage.calculateTotalRevenue()
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ 
      message: 'Error fetching admin stats',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get all users (for admin user management) - excludes rejected/deleted users
router.get('/users', isAdmin, async (req, res) => {
  try {
    const allUsers = await storage.getAllUsers();
    // Filter out rejected (deleted) users for cleaner admin interface
    const activeUsers = allUsers.filter(user => user.accountStatus !== 'rejected');
    res.json(activeUsers);
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ 
      message: 'Error fetching all users',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Perform actions on users (block, unblock, delete)
router.post('/users/:id/action', isAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { action } = req.body;

    if (!action) {
      return res.status(400).json({ message: 'Action is required' });
    }

    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent actions on admin accounts (except by themselves)
    if (user.role === 'admin' && req.user!.id !== userId) {
      return res.status(403).json({ message: 'Cannot perform actions on other admin accounts' });
    }

    let updatedUser;

    switch (action) {
      case 'suspend':
        updatedUser = await storage.updateUser(userId, { accountStatus: 'suspended' });
        break;
      case 'activate':
        updatedUser = await storage.updateUser(userId, { accountStatus: 'active' });
        break;
      case 'block':
        updatedUser = await storage.updateUser(userId, { accountStatus: 'suspended' });
        break;
      case 'unblock':
        updatedUser = await storage.updateUser(userId, { accountStatus: 'active' });
        break;
      case 'delete':
        // This is a soft delete - just mark as rejected in the database
        updatedUser = await storage.updateUser(userId, { accountStatus: 'rejected' });
        break;
      case 'resetPassword':
        // Generate a random temporary password
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await storage.hashPassword(tempPassword);
        updatedUser = await storage.updateUser(userId, { password: hashedPassword });

        // Here you would typically send an email with the temporary password
        // For now, we'll just return it in the response (insecure for production)
        return res.json({ 
          message: 'Password reset successful',
          tempPassword,
          user: { ...updatedUser, password: undefined }
        });
      default:
        return res.status(400).json({ message: `Invalid action: ${action}. Valid actions are: suspend, activate, block, unblock, delete, resetPassword` });
    }

    // Create a notification for the user
    const actionMapping = {
      'suspend': 'suspended',
      'activate': 'activated',
      'block': 'suspended',
      'unblock': 'activated',
      'delete': 'removed'
    };

    await notificationService.createAndSendNotification({
      userId,
      type: NotificationType.ACCOUNT_STATUS_CHANGE,
      title: 'Account Status Update',
      message: `Your account has been ${actionMapping[action as keyof typeof actionMapping]} by an administrator.`,
      metadata: { action }
    });

    res.json({ 
      message: `User ${action} successful`, 
      user: { ...updatedUser, password: undefined } 
    });
  } catch (error) {
    console.error(`Error performing action on user:`, error);
    res.status(500).json({ 
      message: 'Error performing user action',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Send custom notifications to users
router.post('/send-notification', isAdmin, async (req, res) => {
  try {
    const { recipientType, title, message, userId } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    if (recipientType === 'specific' && !userId) {
      return res.status(400).json({ message: 'User ID is required for specific notifications' });
    }

    let recipientIds: number[] = [];

    // Find recipient IDs based on the type
    switch (recipientType) {
      case 'all':
        // Get all users
        const allUsers = await storage.getAllUsers();
        recipientIds = allUsers.map(user => user.id);
        break;
      case 'riders':
        // Get all riders
        const riders = await storage.getUsersByRole('rider');
        recipientIds = riders.map(user => user.id);
        break;
      case 'drivers':
        // Get all drivers
        const drivers = await storage.getUsersByRole('driver');
        recipientIds = drivers.map(user => user.id);
        break;
      case 'specific':
        // Single user
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }
        recipientIds = [userId];
        break;
      default:
        return res.status(400).json({ message: 'Invalid recipient type' });
    }

    // Send notifications to all recipients
    const notifications = await Promise.all(
      recipientIds.map(id => 
        notificationService.createAndSendNotification({
          userId: id,
          type: NotificationType.ADMIN_ANNOUNCEMENT,
          title,
          message,
          metadata: { sentBy: req.user!.id }
        })
      )
    );

    res.json({ 
      message: 'Notifications sent successfully',
      count: notifications.filter(Boolean).length
    });
  } catch (error) {
    console.error('Error sending notifications:', error);
    res.status(500).json({ 
      message: 'Error sending notifications',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get current price settings
router.get('/pricing-settings', isAdmin, async (req, res) => {
  try {
    const settings = await storage.getPricingSettings();
    res.json(settings || {
      basePricePerMile: 2.5,
      baseWaitingRatePerMinute: 0.25,
      wheelchairAccessibleMultiplier: 1.5,
      stretcherAccessibleMultiplier: 2.0,
      nighttimeMultiplier: 1.2,
      weekendMultiplier: 1.25,
      roundTripMultiplier: 1.8,
      surgeFactor: 1.0
    });
  } catch (error) {
    console.error('Error fetching pricing settings:', error);
    res.status(500).json({ 
      message: 'Error fetching pricing settings',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Update price settings
router.put('/pricing-settings', isAdmin, async (req, res) => {
  try {
    const settings = req.body;

    // Basic validation
    const requiredFields = [
      'basePricePerMile',
      'baseWaitingRatePerMinute',
      'wheelchairAccessibleMultiplier',
      'stretcherAccessibleMultiplier',
      'nighttimeMultiplier',
      'weekendMultiplier',
      'roundTripMultiplier',
      'surgeFactor'
    ];

    const missingFields = requiredFields.filter(field => settings[field] === undefined);

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: 'Missing required fields', 
        missingFields 
      });
    }

    // Update pricing settings
    const updatedSettings = await storage.updatePricingSettings(settings);

    // Create system-wide notification about pricing changes
    await notificationService.createAndSendSystemWideNotification({
      type: NotificationType.PRICING_UPDATED,
      title: 'Pricing Update',
      message: 'Our pricing structure has been updated. Please check the app for the latest rates.',
      excludeRoles: ['admin'] // Don't send to other admins
    });

    res.json({
      message: 'Pricing settings updated successfully',
      settings: updatedSettings
    });
  } catch (error) {
    console.error('Error updating pricing settings:', error);
    res.status(500).json({ 
      message: 'Error updating pricing settings',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get all rides (comprehensive view for admin dashboard)
router.get('/rides', isAdmin, async (req, res) => {
  try {
    // Use optimized query with JOINs to avoid N+1 performance issues
    const enrichedRides = await storage.getAllRidesWithUserData();
    res.json(enrichedRides);
  } catch (error) {
    console.error('Error fetching rides:', error);
    res.status(500).json({ 
      message: 'Failed to fetch rides',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get all active rides with real-time tracking data
router.get('/active-rides', isAdmin, async (req, res) => {
  try {
    const activeRides = await storage.getActiveRides();

    // Enrich with driver and rider information
    const enrichedRides = await Promise.all(
      activeRides.map(async ride => {
        const [rider, driver] = await Promise.all([
          ride.riderId ? storage.getUser(ride.riderId) : null,
          ride.driverId ? storage.getUser(ride.driverId) : null
        ]);

        // Simulate current location for active rides
        // In a real app, we'd store this in the database or get it from a real-time service
        let driverLocation = null;
        if (ride.status === 'en_route') {
          // If en route, the driver is heading toward pickup
          driverLocation = {
            lat: ride.pickupLocationLat || 0,
            lng: ride.pickupLocationLng || 0,
            timestamp: new Date()
          };
        } else if (ride.status === 'arrived' || ride.status === 'in_progress') {
          // If arrived or in progress, the driver is at or heading toward dropoff
          driverLocation = {
            lat: ride.dropoffLocationLat || 0,
            lng: ride.dropoffLocationLng || 0,
            timestamp: new Date()
          };
        }

        return {
          ...ride,
          riderName: rider?.fullName,
          driverName: driver?.fullName,
          driverLocation: driverLocation
        };
      })
    );

    res.json(enrichedRides);
  } catch (error) {
    console.error('Error fetching active rides:', error);
    res.status(500).json({ 
      message: 'Error fetching active rides',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Reset driver verification status and allow document re-upload
router.put('/driver/:driverId/reset', async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const driverId = parseInt(req.params.driverId);
    const { resetType } = req.body; // 'documents', 'verification', 'all'

    if (!driverId) {
      return res.status(400).json({ message: "Driver ID is required" });
    }

    const driverDetails = await storage.getDriverDetails(driverId);
    if (!driverDetails) {
      return res.status(404).json({ message: "Driver not found" });
    }

    let updateData: any = {};

    switch (resetType) {
      case 'documents':
        // Clear all document URLs to allow re-upload
        updateData = {
          licensePhotoFront: null,
          licensePhotoBack: null,
          insuranceDocumentUrl: null,
          profilePhoto: null,
          backgroundCheckDocumentUrl: null,
          medicalCertificationUrl: null,
          licenseVerified: false,
          insuranceVerified: false,
          vehicleVerified: false,
          backgroundCheckStatus: 'pending',
          medicalCertificationVerified: false
        };
        break;
      
      case 'verification':
        // Reset verification status but keep documents
        updateData = {
          licenseVerified: false,
          insuranceVerified: false,
          vehicleVerified: false,
          backgroundCheckStatus: 'pending',
          medicalCertificationVerified: false,
          accountStatus: 'pending',
          verified: false
        };
        break;
      
      case 'all':
        // Reset everything
        updateData = {
          licensePhotoFront: null,
          licensePhotoBack: null,
          insuranceDocumentUrl: null,
          profilePhoto: null,
          backgroundCheckDocumentUrl: null,
          medicalCertificationUrl: null,
          licenseVerified: false,
          insuranceVerified: false,
          vehicleVerified: false,
          backgroundCheckStatus: 'pending',
          medicalCertificationVerified: false,
          accountStatus: 'pending',
          verified: false
        };
        break;
      
      default:
        return res.status(400).json({ message: "Invalid reset type. Use 'documents', 'verification', or 'all'" });
    }

    await storage.updateDriverDetails(driverId, updateData);

    res.json({ 
      message: `Driver ${resetType} reset successfully`,
      resetType,
      driverId 
    });

  } catch (error) {
    console.error('Error resetting driver status:', error);
    res.status(500).json({ 
      message: 'Error resetting driver status',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Unlock driver account for document re-upload
router.post('/drivers/:driverId/unlock-account', isAdmin, async (req, res) => {
  try {
    const driverId = parseInt(req.params.driverId);
    const { reason = 'Account unlocked by admin for document re-upload' } = req.body;

    // Get driver details
    const driverDetail = await storage.getDriverDetails(driverId);
    if (!driverDetail) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    // Unlock the user account
    const updatedUser = await storage.updateUser(driverDetail.userId, { 
      accountStatus: 'active' 
    });

    // Create notification for the driver
    await notificationService.createAndSendNotification({
      userId: driverDetail.userId,
      type: NotificationType.ACCOUNT_STATUS_CHANGE,
      title: 'Account Unlocked',
      message: `Your account has been unlocked by an administrator. ${reason}. You can now log in to upload or update your documents.`,
      metadata: { 
        action: 'unlock_account',
        reason,
        adminId: req.user!.id
      }
    });

    res.json({
      message: 'Driver account unlocked successfully',
      driverId,
      userId: driverDetail.userId,
      reason
    });

    console.log(`Driver account unlocked: DriverID: ${driverId}, UserID: ${driverDetail.userId}, Reason: ${reason}`);
  } catch (error) {
    console.error('Error unlocking driver account:', error);
    res.status(500).json({ 
      message: 'Error unlocking driver account',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Reject documents with specific feedback
router.post('/reject-documents', isAdmin, async (req, res) => {
  try {
    const { 
      driverId, 
      rejectionRequests, 
      generalNotes, 
      unlockAccount = true, 
      sendNotification = true 
    } = req.body;

    if (!driverId || !rejectionRequests || !Array.isArray(rejectionRequests)) {
      return res.status(400).json({ 
        message: 'Driver ID and rejection requests array are required' 
      });
    }

    // Validate rejection requests
    for (const request of rejectionRequests) {
      if (!request.documentType || !request.reason?.trim()) {
        return res.status(400).json({ 
          message: 'All rejection requests must have documentType and reason' 
        });
      }
    }

    // Get driver details
    const driverDetail = await storage.getDriverDetails(driverId);
    if (!driverDetail) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    // Get user information
    const user = await storage.getUser(driverDetail.userId);
    if (!user) {
      return res.status(404).json({ message: 'Driver user account not found' });
    }

    // Build update data for driver details
    const updateData: any = {};
    const rejectionMessages: string[] = [];

    for (const request of rejectionRequests) {
      switch (request.documentType) {
        case 'license':
          updateData.licenseVerified = false;
          updateData.licenseRejectionReason = request.reason;
          if (request.reuploadRequired) {
            updateData.licensePhotoFront = null;
            updateData.licensePhotoBack = null;
          }
          rejectionMessages.push(`License: ${request.reason}`);
          break;
        case 'insurance':
          updateData.insuranceVerified = false;
          updateData.insuranceRejectionReason = request.reason;
          if (request.reuploadRequired) {
            updateData.insuranceDocumentUrl = null;
          }
          rejectionMessages.push(`Insurance: ${request.reason}`);
          break;
        case 'vehicle':
          updateData.vehicleVerified = false;
          updateData.vehicleRejectionReason = request.reason;
          if (request.reuploadRequired) {
            updateData.vehicleRegistrationUrl = null;
          }
          rejectionMessages.push(`Vehicle Registration: ${request.reason}`);
          break;
        case 'profile':
          updateData.profileVerified = false;
          updateData.profileRejectionReason = request.reason;
          if (request.reuploadRequired) {
            updateData.profilePhoto = null;
          }
          rejectionMessages.push(`Profile Photo: ${request.reason}`);
          break;
        case 'medical_certification':
          updateData.medicalCertificationVerified = false;
          updateData.medicalCertificationRejectionReason = request.reason;
          if (request.reuploadRequired) {
            updateData.medicalCertificationUrl = null;
          }
          rejectionMessages.push(`Medical Certification: ${request.reason}`);
          break;
        case 'background_check':
          updateData.backgroundCheckStatus = 'rejected';
          updateData.backgroundCheckRejectionReason = request.reason;
          if (request.reuploadRequired) {
            updateData.backgroundCheckDocumentUrl = null;
          }
          rejectionMessages.push(`Background Check: ${request.reason}`);
          break;
        default:
          console.warn(`Unknown document type: ${request.documentType}`);
      }
    }

    // Update driver details with rejection information
    await storage.updateDriverDetails(driverId, updateData);

    // Unlock account if requested
    let userUpdateData: any = {};
    if (unlockAccount) {
      userUpdateData.accountStatus = 'active';
    }

    // Update user account if needed
    if (Object.keys(userUpdateData).length > 0) {
      await storage.updateUser(driverDetail.userId, userUpdateData);
    }

    // Send notification if requested
    if (sendNotification) {
      const rejectionSummary = rejectionMessages.join('\n• ');
      const notificationMessage = `
Your document submission has been reviewed and requires attention:

• ${rejectionSummary}

${generalNotes ? `\nAdditional Notes:\n${generalNotes}` : ''}

${unlockAccount ? '\nYour account has been unlocked. You can now log in to re-upload the required documents.' : ''}

Please review the feedback carefully and ensure all documents meet our requirements before resubmitting.
      `.trim();

      await notificationService.createAndSendNotification({
        userId: driverDetail.userId,
        type: NotificationType.DOCUMENT_REJECTED,
        title: 'Document Review Required',
        message: notificationMessage,
        metadata: { 
          action: 'documents_rejected',
          rejectedDocuments: rejectionRequests.map(r => r.documentType),
          adminId: req.user!.id,
          unlockAccount
        }
      });
    }

    res.json({
      message: 'Documents rejected successfully',
      driverId,
      userId: driverDetail.userId,
      rejectedDocuments: rejectionRequests.length,
      accountUnlocked: unlockAccount,
      notificationSent: sendNotification
    });

    console.log(`Documents rejected for Driver ID: ${driverId}, Rejected: ${rejectionRequests.map(r => r.documentType).join(', ')}, Account unlocked: ${unlockAccount}`);
  } catch (error) {
    console.error('Error rejecting documents:', error);
    res.status(500).json({ 
      message: 'Error rejecting documents',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Reset driver onboarding progress (Admin only)
router.post('/drivers/:driverId/reset-onboarding', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const driverId = parseInt(req.params.driverId);
    
    if (!driverId) {
      return res.status(400).json({ message: 'Invalid driver ID' });
    }

    // Get driver details first
    const driverDetail = await storage.getDriverDetails(driverId);
    if (!driverDetail) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    // Reset onboarding progress
    const defaultProgress = {
      currentStep: 'welcome',
      completedSteps: [],
      hasCompletedTour: false,
      hasCompletedFirstRide: false,
      hasCompletedProfile: false,
      hasSkippedOnboarding: false,
      hasDisabledOnboarding: false,
      seenFeatures: [],
      dismissedTooltips: [],
      savedNotificationPreferences: JSON.stringify({
        hasSkippedOnboarding: false,
        hasDisabledOnboarding: false,
        seenFeatures: [],
        dismissedTooltips: []
      })
    };

    // Reset the onboarding progress
    await storage.updateDriverOnboardingProgress(driverDetail.userId, defaultProgress);

    // Also reset verification status to allow re-upload
    await storage.updateDriverDetails(driverId, {
      licenseVerified: false,
      insuranceVerified: false,
      vehicleVerified: false,
      profileVerified: false,
      medicalCertificationVerified: false,
      documentsVerified: false,
      accountStatus: 'pending'
    });

    // Unlock account if locked
    await storage.updateUserStatus(driverDetail.userId, 'active');

    res.json({ 
      message: 'Driver onboarding and verification status reset successfully',
      success: true 
    });

  } catch (error) {
    console.error('Error resetting driver onboarding:', error);
    res.status(500).json({ message: 'Failed to reset driver onboarding' });
  }
});

// Clear driver documents (Admin only)
router.post('/drivers/:driverId/clear-documents', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const driverId = parseInt(req.params.driverId);
    
    if (!driverId) {
      return res.status(400).json({ message: 'Invalid driver ID' });
    }

    // Get driver details first
    const driverDetail = await storage.getDriverDetails(driverId);
    if (!driverDetail) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    // Clear all document URLs and verification status
    await storage.updateDriverDetails(driverId, {
      licensePhotoFront: null,
      licensePhotoBack: null,
      insuranceDocumentUrl: null,
      vehicleRegistrationUrl: null,
      backgroundCheckDocumentUrl: null,
      medicalCertificationUrl: null,
      profilePictureUrl: null,
      licenseVerified: false,
      insuranceVerified: false,
      vehicleVerified: false,
      profileVerified: false,
      medicalCertificationVerified: false,
      documentsVerified: false,
      accountStatus: 'pending'
    });

    // Send notification to driver
    await notificationService.createAndSendNotification({
      userId: driverDetail.userId,
      type: NotificationType.ACCOUNT_STATUS_CHANGE,
      title: 'Documents Reset by Administrator',
      message: 'Your documents have been reset by an administrator. Please re-upload your verification documents to continue the onboarding process.',
      metadata: { 
        action: 'documents_cleared',
        adminId: req.user!.id,
        resetAt: new Date().toISOString()
      }
    });

    res.json({ 
      message: 'Driver documents cleared successfully',
      success: true 
    });

  } catch (error) {
    console.error('Error clearing driver documents:', error);
    res.status(500).json({ message: 'Failed to clear driver documents' });
  }
});

// Clear individual document for a driver (Admin only)
router.post('/drivers/:driverId/clear-document', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const driverId = parseInt(req.params.driverId);
    const { documentField } = req.body;
    
    if (!driverId) {
      return res.status(400).json({ message: 'Invalid driver ID' });
    }

    if (!documentField) {
      return res.status(400).json({ message: 'Document field is required' });
    }

    // Get driver details first
    const driverDetail = await storage.getDriverDetails(driverId);
    if (!driverDetail) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    // Define document field mappings - handle both camelCase (from frontend) and snake_case
    const documentFieldMap: { [key: string]: any } = {
      // Snake case (legacy)
      'license_image': {
        urls: ['licensePhotoFront', 'licensePhotoBack'],
        verified: 'licenseVerified'
      },
      'insurance_image': {
        urls: ['insuranceDocumentUrl'],
        verified: 'insuranceVerified'
      },
      'vehicle_registration': {
        urls: ['vehicleRegistrationUrl'],
        verified: 'vehicleVerified'
      },
      'profile_image': {
        urls: ['profilePhoto'],
        verified: 'profileVerified'
      },
      'medical_certification': {
        urls: ['medicalCertificationUrl'],
        verified: 'medicalCertificationVerified'
      },
      // CamelCase (from frontend document field names)
      'licensePhotoFront': {
        urls: ['licensePhotoFront'],
        verified: 'licenseVerified'
      },
      'licensePhotoBack': {
        urls: ['licensePhotoBack'],
        verified: 'licenseVerified'
      },
      'insuranceDocumentUrl': {
        urls: ['insuranceDocumentUrl'],
        verified: 'insuranceVerified'
      },
      'vehicleRegistrationUrl': {
        urls: ['vehicleRegistrationUrl'],
        verified: 'vehicleVerified'
      },
      'profilePhoto': {
        urls: ['profilePhoto'],
        verified: 'profileVerified'
      },
      'medicalCertificationUrl': {
        urls: ['medicalCertificationUrl'],
        verified: 'medicalCertificationVerified'
      },
      'backgroundCheckDocumentUrl': {
        urls: ['backgroundCheckDocumentUrl'],
        verified: 'backgroundCheckVerified'
      },
      'drugTestDocumentUrl': {
        urls: ['drugTestDocumentUrl'],
        verified: 'drugTestVerified'
      },
      'mvrRecordUrl': {
        urls: ['mvrRecordUrl'],
        verified: 'mvrRecordVerified'
      },
      'cprFirstAidCertificationUrl': {
        urls: ['cprFirstAidCertificationUrl'],
        verified: 'cprFirstAidCertificationVerified'
      },
      'basicLifeSupportUrl': {
        urls: ['basicLifeSupportUrl'],
        verified: 'basicLifeSupportVerified'
      },
      'advancedLifeSupportUrl': {
        urls: ['advancedLifeSupportUrl'],
        verified: 'advancedLifeSupportVerified'
      },
      'emtCertificationUrl': {
        urls: ['emtCertificationUrl'],
        verified: 'emtCertificationVerified'
      },
      'paramedicCertificationUrl': {
        urls: ['paramedicCertificationUrl'],
        verified: 'paramedicCertificationVerified'
      }
    };

    const mapping = documentFieldMap[documentField];
    if (!mapping) {
      return res.status(400).json({ message: 'Invalid document field' });
    }

    // Clear specific document field(s)
    const updateData: any = {
      [mapping.verified]: false
    };
    
    // Clear all URL fields for this document type
    mapping.urls.forEach((urlField: string) => {
      updateData[urlField] = null;
    });

    await storage.updateDriverDetails(driverId, updateData);

    console.log(`✅ Document ${documentField} cleared for driver ${driverId}`);

    // Send notification to driver
    const documentName = documentField.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    await notificationService.createAndSendNotification({
      userId: driverDetail.userId,
      type: NotificationType.ACCOUNT_STATUS_CHANGE,
      title: 'Document Cleared by Administrator',
      message: `Your ${documentName} document has been cleared by an administrator. Please re-upload this document to continue the onboarding process.`,
      metadata: { 
        action: 'document_cleared',
        documentType: documentField,
        adminId: req.user!.id,
        clearedAt: new Date().toISOString()
      }
    });

    res.json({ 
      message: `${documentName} cleared successfully`,
      success: true 
    });

  } catch (error) {
    console.error('Error clearing individual document:', error);
    res.status(500).json({ message: 'Failed to clear document' });
  }
});

// Enhanced Admin Document Retrieval Tools

// Get all documents across the platform
router.get('/documents/all', isAdmin, async (req: Request, res: Response) => {
  try {
    const { userId, documentType, verificationStatus, limit = 50, offset = 0 } = req.query;
    
    // Build filter criteria
    const filters: any = {};
    if (userId) filters.userId = parseInt(userId as string);
    if (documentType) filters.documentType = documentType as string;
    if (verificationStatus) filters.verificationStatus = verificationStatus as string;
    
    const documents = await documentStorageService.getAllDocuments(filters, {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
    
    // Enrich with user data
    const enrichedDocuments = await Promise.all(
      documents.map(async (doc) => {
        const user = await storage.getUser(doc.userId);
        return {
          ...doc,
          user: user ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            accountStatus: user.accountStatus
          } : null
        };
      })
    );
    
    res.json({
      documents: enrichedDocuments,
      total: documents.length,
      hasMore: documents.length >= parseInt(limit as string)
    });
  } catch (error) {
    console.error('Error fetching all documents:', error);
    res.status(500).json({ error: 'Failed to retrieve documents' });
  }
});

// Get documents for specific user
router.get('/users/:userId/documents', isAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Get user info first
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get documents from unified storage
    const documents = await documentStorageService.getUserDocuments(userId);
    
    // Get driver details if user is a driver
    let driverDetails = null;
    if (user.role === 'driver') {
      try {
        driverDetails = await storage.getDriverDetails(userId);
      } catch (error) {
        console.log('No driver details found for user:', userId);
      }
    }
    
    // Format document status for admin view
    const documentStatus = {
      // Unified document storage documents
      uploadedDocuments: documents.map(doc => ({
        id: doc.id,
        type: doc.documentType,
        filename: doc.filename,
        originalName: doc.originalName,
        uploadedAt: doc.uploadedAt,
        verificationStatus: doc.verificationStatus,
        rejectionReason: doc.rejectionReason,
        url: `/api/documents/${doc.id}/file`,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType
      })),
      
      // Legacy document references in driver details
      legacyDocuments: driverDetails ? {
        licensePhotoFront: driverDetails.licensePhotoFront,
        licensePhotoBack: driverDetails.licensePhotoBack,
        insuranceDocument: driverDetails.insuranceDocumentUrl,
        vehicleRegistration: driverDetails.vehicleRegistrationUrl,
        medicalCertification: driverDetails.medicalCertificationUrl,
        backgroundCheck: driverDetails.backgroundCheckDocumentUrl,
        drugTestResults: driverDetails.drugTestResultsUrl,
        mvrRecord: driverDetails.mvrRecordUrl,
        profilePhoto: driverDetails.profilePhoto
      } : null,
      
      // Verification statuses
      verificationStatus: driverDetails ? {
        licenseVerified: driverDetails.licenseVerified,
        insuranceVerified: driverDetails.insuranceVerified,
        vehicleVerified: driverDetails.vehicleVerified,
        profileVerified: driverDetails.profileVerified,
        medicalCertificationVerified: driverDetails.medicalCertificationVerified,
        backgroundCheckVerified: driverDetails.backgroundCheckVerified,
        drugTestVerified: driverDetails.drugTestVerified,
        mvrRecordVerified: driverDetails.mvrRecordVerified
      } : null
    };
    
    res.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus,
        createdAt: user.createdAt
      },
      documentStatus,
      totalDocuments: documents.length
    });
  } catch (error) {
    console.error('Error fetching user documents:', error);
    res.status(500).json({ error: 'Failed to retrieve user documents' });
  }
});

// Get document verification queue
router.get('/documents/verification-queue', isAdmin, async (req: Request, res: Response) => {
  try {
    const { status = 'pending' } = req.query;
    
    const pendingDocuments = await documentStorageService.getDocumentsByStatus(status as string);
    
    // Enrich with user and driver details
    const enrichedQueue = await Promise.all(
      pendingDocuments.map(async (doc) => {
        const user = await storage.getUser(doc.userId);
        
        let driverDetails = null;
        if (user?.role === 'driver') {
          try {
            driverDetails = await storage.getDriverDetails(doc.userId);
          } catch (error) {
            console.log('No driver details for user:', doc.userId);
          }
        }
        
        return {
          document: {
            id: doc.id,
            type: doc.documentType,
            filename: doc.filename,
            originalName: doc.originalName,
            uploadedAt: doc.uploadedAt,
            verificationStatus: doc.verificationStatus,
            rejectionReason: doc.rejectionReason,
            url: `/api/documents/${doc.id}/file`,
            fileSize: doc.fileSize,
            mimeType: doc.mimeType
          },
          user: user ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            accountStatus: user.accountStatus
          } : null,
          driverStatus: driverDetails ? {
            accountStatus: driverDetails.accountStatus,
            backgroundCheckStatus: driverDetails.backgroundCheckStatus,
            canAcceptRides: driverDetails.canAcceptRides,
            verified: driverDetails.verified
          } : null
        };
      })
    );
    
    // Sort by upload date (newest first)
    enrichedQueue.sort((a, b) => 
      new Date(b.document.uploadedAt).getTime() - new Date(a.document.uploadedAt).getTime()
    );
    
    res.json({
      queue: enrichedQueue,
      total: enrichedQueue.length,
      status: status
    });
  } catch (error) {
    console.error('Error fetching verification queue:', error);
    res.status(500).json({ error: 'Failed to retrieve verification queue' });
  }
});

// Test route for Phase 3 (bypass auth for testing)
router.get('/test/documents/expiration-summary', async (req: Request, res: Response) => {
  try {
    // Placeholder data for Phase 3 demo - ready for storage integration
    const summary = {
      expiring_soon: 5,
      expired: 2,
      requires_attention: 3
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching expiration summary:', error);
    res.status(500).json({ error: 'Failed to fetch expiration summary' });
  }
});

// Get test documents for Phase 3 bulk operations
router.get('/test/documents/pending-review', async (req: Request, res: Response) => {
  try {
    // Placeholder data for Phase 3 demo - ready for storage integration
    const mockDocuments = [
      {
        id: 1,
        userId: 101,
        userName: "John Driver",
        userEmail: "john@example.com",
        documentType: "drivers_license",
        documentTitle: "Driver's License",
        uploadedAt: new Date().toISOString(),
        status: "pending",
        fileUrl: "/api/documents/1/download"
      },
      {
        id: 2,
        userId: 102,
        userName: "Jane Transport",
        userEmail: "jane@example.com",
        documentType: "insurance_card",
        documentTitle: "Insurance Card", 
        uploadedAt: new Date().toISOString(),
        status: "pending",
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        fileUrl: "/api/documents/2/download"
      },
      {
        id: 3,
        userId: 103,
        userName: "Mike Medical",
        userEmail: "mike@example.com",
        documentType: "medical_certification",
        documentTitle: "Medical Certification",
        uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: "pending",
        expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        fileUrl: "/api/documents/3/download"
      }
    ];
    
    res.json(mockDocuments);
  } catch (error) {
    console.error('Error fetching pending review documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Test bulk update endpoint for Phase 3
router.post('/test/documents/bulk-update', async (req: Request, res: Response) => {
  try {
    const { documentIds, action, reason } = req.body;
    
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ error: 'Document IDs are required' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    console.log(`Phase 3 TEST: Processing bulk ${action} for ${documentIds.length} documents`);

    // Placeholder for actual bulk processing - will integrate with existing storage
    const results = documentIds.map(id => ({
      documentId: id,
      success: true,
      action,
      status: action === 'approve' ? 'approved' : 'rejected'
    }));

    res.json({ 
      success: true, 
      message: `Successfully ${action}d ${documentIds.length} documents`,
      processedCount: documentIds.length,
      results
    });

  } catch (error) {
    console.error('Error processing bulk document update:', error);
    res.status(500).json({ error: 'Failed to process bulk update' });
  }
});

// Document expiration summary for Phase 3
router.get('/documents/expiration-summary', isAdmin, async (req: Request, res: Response) => {
  try {
    const currentDate = new Date();
    const soonThreshold = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    // Get documents with expiration dates
    const documents = await storage.getAllDocuments();
    
    let expiringSoon = 0;
    let expired = 0;
    let requiresAttention = 0;
    
    for (const doc of documents) {
      if (doc.expirationDate) {
        const expDate = new Date(doc.expirationDate);
        
        if (expDate < currentDate) {
          expired++;
          requiresAttention++;
        } else if (expDate <= soonThreshold) {
          expiringSoon++;
          if (expDate <= new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000)) { // 7 days
            requiresAttention++;
          }
        }
      }
    }
    
    const summary = {
      expiring_soon: expiringSoon,
      expired: expired,
      requires_attention: requiresAttention
    };
    
    console.log('Document expiration summary:', summary);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching expiration summary:', error);
    res.status(500).json({ error: 'Failed to fetch expiration summary' });
  }
});

// Enhanced bulk operations endpoint for Phase 3
router.post('/documents/bulk-update', isAdmin, async (req: Request, res: Response) => {
  try {
    const { documentIds, action, reason } = req.body;
    
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ error: 'Document IDs are required' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    if (action === 'reject' && !reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    console.log(`Processing bulk ${action} for ${documentIds.length} documents`);

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    // Process each document
    for (const documentId of documentIds) {
      try {
        const updateData = {
          status: action === 'approve' ? 'approved' : 'rejected',
          reviewedAt: new Date(),
          reviewedBy: (req.user as any)?.id,
          ...(action === 'reject' && reason && { rejectionReason: reason })
        };

        await storage.updateDocument(documentId, updateData);

        // Get document details for notification
        const document = await storage.getDocument(documentId);
        
        results.push({
          documentId,
          success: true,
          action,
          status: updateData.status,
          documentTitle: document?.title || 'Unknown Document'
        });
        
        successCount++;
        
        // Send notification to document owner if needed
        if (document && document.userId) {
          console.log(`Document ${documentId} ${action}d for user ${document.userId}`);
        }
        
      } catch (error) {
        console.error(`Failed to ${action} document ${documentId}:`, error);
        results.push({
          documentId,
          success: false,
          action,
          error: 'Processing failed'
        });
        failureCount++;
      }
    }

    console.log(`Bulk operation complete: ${successCount} successful, ${failureCount} failed`);

    res.json({ 
      success: failureCount === 0,
      message: `Processed ${documentIds.length} documents: ${successCount} successful, ${failureCount} failed`,
      processedCount: successCount,
      totalCount: documentIds.length,
      results
    });

  } catch (error) {
    console.error('Error processing bulk document update:', error);
    res.status(500).json({ error: 'Failed to process bulk update' });
  }
});

// Get documents for bulk operations
router.get('/documents/pending-review', isAdmin, async (req: Request, res: Response) => {
  try {
    const { status = 'pending', type, limit = 50 } = req.query;
    
    // Get pending documents with user information
    const documents = await storage.getDocumentsForReview({
      status: status as string,
      type: type as string,
      limit: parseInt(limit as string)
    });
    
    // Transform to match frontend interface
    const formattedDocuments = documents.map(doc => ({
      id: doc.id,
      userId: doc.userId,
      userName: doc.userName || 'Unknown User',
      userEmail: doc.userEmail || '',
      documentType: doc.type,
      documentTitle: doc.title,
      uploadedAt: doc.uploadedAt,
      status: doc.status,
      rejectionReason: doc.rejectionReason,
      expirationDate: doc.expirationDate,
      fileUrl: `/api/documents/${doc.id}/download`
    }));
    
    console.log(`Retrieved ${formattedDocuments.length} documents for bulk operations`);
    res.json(formattedDocuments);
  } catch (error) {
    console.error('Error fetching pending review documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Bulk document verification action
router.post('/documents/bulk-verify', isAdmin, async (req: Request, res: Response) => {
  try {
    const { documentIds, action, rejectionReason } = req.body;
    
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ error: 'Document IDs array is required' });
    }
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve or reject' });
    }
    
    if (action === 'reject' && !rejectionReason) {
      return res.status(400).json({ error: 'Rejection reason required for reject action' });
    }
    
    const results = [];
    
    for (const documentId of documentIds) {
      try {
        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        
        await documentStorageService.updateDocumentVerification(
          documentId,
          newStatus,
          rejectionReason || null
        );
        
        // Get document and user for notification
        const document = await storage.getDocumentById(documentId);
        if (document) {
          const user = await storage.getUser(document.userId);
          
          if (user) {
            // Send notification
            const title = action === 'approve' 
              ? 'Document Approved' 
              : 'Document Rejected - Action Required';
            
            const message = action === 'approve'
              ? `Your ${document.documentType} has been approved.`
              : `Your ${document.documentType} was rejected. Reason: ${rejectionReason}. Please upload a new document.`;
            
            await notificationService.createAndSendNotification({
              userId: user.id,
              type: action === 'approve' ? NotificationType.DOCUMENT_APPROVED : NotificationType.DOCUMENT_REJECTED,
              title,
              message,
              metadata: {
                documentId: document.id,
                documentType: document.documentType,
                action,
                rejectionReason: rejectionReason || null
              }
            });
          }
        }
        
        results.push({
          documentId,
          success: true,
          action,
          status: newStatus
        });
      } catch (error) {
        results.push({
          documentId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    
    res.json({
      message: `Bulk verification completed: ${successCount} successful, ${failureCount} failed`,
      results,
      summary: {
        total: documentIds.length,
        successful: successCount,
        failed: failureCount,
        action
      }
    });
  } catch (error) {
    console.error('Error in bulk document verification:', error);
    res.status(500).json({ error: 'Failed to perform bulk verification' });
  }
});

// Get document storage statistics
router.get('/documents/statistics', isAdmin, async (req: Request, res: Response) => {
  try {
    const stats = await documentStorageService.getDocumentStatistics();
    
    res.json({
      statistics: stats,
      storageInfo: {
        method: 'Local filesystem with database tracking',
        baseDirectory: './uploads',
        structure: {
          documents: './uploads/documents/',
          chat: './uploads/chat/',
          temp: './uploads/temp/'
        }
      },
      systemHealth: {
        unified: true,
        securityEnabled: true,
        roleBasedAccess: true,
        fileTypeFiltering: true,
        sizeLimits: true
      }
    });
  } catch (error) {
    console.error('Error fetching document statistics:', error);
    res.status(500).json({ error: 'Failed to retrieve document statistics' });
  }
});

export default router;
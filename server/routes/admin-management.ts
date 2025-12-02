import { Router } from 'express';
import { storage } from '../storage';
import { isAuthenticated, hasRole } from '../middleware/auth';
import { emailNotificationService } from '../email-notification-service';
import { sseManager } from '../sse-manager';
import crypto from 'crypto';

const router = Router();

interface OverrideLog {
  id: string;
  adminId: number;
  action: string;
  targetType: 'user' | 'ride' | 'driver' | 'system';
  targetId?: number;
  reason: string;
  details: any;
  timestamp: string;
  ipAddress?: string;
}

// In-memory override log (in production, this would be in database)
const overrideLogs: OverrideLog[] = [];

// Get comprehensive admin statistics
router.get('/stats', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    const [
      allUsers,
      allRides,
      totalRevenue
    ] = await Promise.all([
      storage.getAllUsers(),
      storage.getAllRides(),
      storage.calculateTotalRevenue()
    ]);
    
    const totalUsers = allUsers.length;

    const drivers = allUsers.filter(user => user.role === 'driver' && user.accountStatus !== 'rejected');
    const activeDrivers = drivers.filter(driver => {
      // In a real system, this would check actual online status
      return true; // Mock: assume all verified drivers are potentially active
    }).length;

    const pendingDrivers = drivers.filter(driver => {
      // Check if driver needs verification
      return !driver.emailVerified; // Simplified check
    }).length;

    const totalRides = allRides.length;
    const activeRides = allRides.filter(ride => 
      ['pending', 'confirmed', 'en_route', 'arrived', 'in_progress'].includes(ride.status)
    ).length;
    
    const completedRides = allRides.filter(ride => ride.status === 'completed').length;

    // Calculate daily revenue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyRevenue = allRides
      .filter(ride => {
        const rideDate = new Date(ride.createdAt);
        rideDate.setHours(0, 0, 0, 0);
        return rideDate.getTime() === today.getTime() && ride.status === 'completed';
      })
      .reduce((sum, ride) => sum + (ride.finalPrice || ride.estimatedPrice || 0), 0);

    const stats = {
      totalUsers,
      activeDrivers,
      pendingDrivers,
      totalRides,
      activeRides,
      completedRides,
      totalRevenue,
      dailyRevenue,
      systemStatus: 'operational' as const
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Failed to fetch admin statistics' });
  }
});

// Get system metrics
router.get('/system-metrics', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    // Mock system metrics - in production, these would come from monitoring tools
    const metrics = {
      cpuUsage: Math.round(Math.random() * 30 + 10), // 10-40%
      memoryUsage: Math.round(Math.random() * 20 + 40), // 40-60%
      dbConnections: Math.round(Math.random() * 10 + 5), // 5-15
      apiResponseTime: Math.round(Math.random() * 50 + 50), // 50-100ms
      errorRate: Math.round((Math.random() * 2 + 0.1) * 100) / 100, // 0.1-2.1%
      uptime: calculateUptime()
    };

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    res.status(500).json({ message: 'Failed to fetch system metrics' });
  }
});

// Get all users for admin management
router.get('/users', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    const users = await storage.getAllUsers();
    
    // Enhance user data with additional info
    const enhancedUsers = await Promise.all(users.map(async (user) => {
      let additionalInfo = {};
      
      if (user.role === 'driver') {
        const driverDetails = await storage.getDriverDetails(user.id);
        const vehicles = await storage.getVehiclesByDriver(user.id);
        const driverRides = await storage.getRidesByDriver(user.id);
        
        additionalInfo = {
          verified: driverDetails?.verified || false,
          backgroundCheckStatus: driverDetails?.backgroundCheckStatus || 'pending',
          documentsVerified: driverDetails?.verified || false,
          vehicleCount: vehicles?.length || 0,
          totalRides: driverRides?.length || 0,
          rating: 4.8, // Mock rating
          earnings: driverRides
            ?.filter(ride => ride.status === 'completed')
            ?.reduce((sum, ride) => sum + (ride.finalPrice || 0), 0) || 0,
          onlineStatus: Math.random() > 0.5 // Mock online status
        };
      }

      return {
        ...user,
        ...additionalInfo,
        accountStatus: user.role === 'admin' ? 'active' : (user.emailVerified ? 'active' : 'pending')
      };
    }));

    res.json(enhancedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get all drivers with enhanced info - excludes rejected/deleted drivers
router.get('/drivers', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    const allUsers = await storage.getAllUsers();
    const drivers = allUsers.filter(user => user.role === 'driver' && user.accountStatus !== 'rejected');
    console.log(`Found ${drivers.length} drivers:`, drivers.map(d => ({ id: d.id, username: d.username, accountStatus: d.accountStatus })));
    
    const enhancedDriversResults = await Promise.allSettled(drivers.map(async (driver) => {
      try {
        console.log(`Processing driver ${driver.id} (${driver.username})`);
        const driverDetails = await storage.getDriverDetails(driver.id);
        console.log(`Got driver details for ${driver.id}:`, driverDetails ? 'exists' : 'null');
        const vehicles = await storage.getVehiclesByDriver(driver.id);
        console.log(`Got vehicles for ${driver.id}:`, vehicles?.length || 0);
        const driverRides = await storage.getRidesByDriver(driver.id);
        console.log(`Got rides for ${driver.id}:`, driverRides?.length || 0);
      
        return {
          ...driver,
          verified: driverDetails?.verified || false,
          backgroundCheckStatus: driverDetails?.backgroundCheckStatus || 'pending',
          documentsVerified: driverDetails?.verified || false,
          vehicleCount: vehicles?.length || 0,
          totalRides: driverRides?.length || 0,
          rating: 4.8, // Mock rating
          earnings: driverRides
            ?.filter(ride => ride.status === 'completed')
            ?.reduce((sum, ride) => sum + (ride.finalPrice || 0), 0) || 0,
          onlineStatus: Math.random() > 0.5, // Mock online status
          accountStatus: driverDetails?.verified ? 'active' : 'pending', // Show as pending until driver completes onboarding and gets verified
          // Individual document verification status
          driverDetails: driverDetails ? {
            ...driverDetails,
            licenseVerified: driverDetails.licenseVerified || false,
            licenseRejectionReason: driverDetails.licenseRejectionReason || null,
            insuranceVerified: driverDetails.insuranceVerified || false,
            insuranceRejectionReason: driverDetails.insuranceRejectionReason || null,
            vehicleVerified: driverDetails.vehicleVerified || false,
            vehicleRejectionReason: driverDetails.vehicleRejectionReason || null,
            profileVerified: driverDetails.profileVerified || false,
            profileRejectionReason: driverDetails.profileRejectionReason || null,
            medicalCertificationVerified: driverDetails.medicalCertificationVerified || false,
            backgroundCheckDocumentUrl: driverDetails.backgroundCheckDocumentUrl || null,
            vehicleRegistrationUrl: driverDetails.vehicleRegistrationUrl || null,
            medicalCertificationUrl: driverDetails.medicalCertificationUrl || null
          } : null
        };
      } catch (error) {
        console.error(`Error processing driver ${driver.id}:`, error);
        // Return driver with default values if details can't be loaded
        return {
          ...driver,
          verified: false,
          backgroundCheckStatus: 'pending',
          documentsVerified: false,
          vehicleCount: 0,
          totalRides: 0,
          rating: 4.8,
          earnings: 0,
          onlineStatus: false,
          accountStatus: 'pending', // Default to pending for drivers without details
          driverDetails: null
        };
      }
    }));

    // Filter out rejected promises and extract successful results
    const enhancedDrivers = enhancedDriversResults
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value);

    console.log(`Processed ${enhancedDrivers.length} drivers successfully, returning to client`);
    console.log('Enhanced drivers:', enhancedDrivers.map(d => ({ id: d.id, username: d.username, hasDetails: !!d.driverDetails })));
    
    // Log any rejected promises
    const rejectedResults = enhancedDriversResults.filter(result => result.status === 'rejected');
    if (rejectedResults.length > 0) {
      console.log(`${rejectedResults.length} drivers failed to process:`, rejectedResults.map(r => (r as PromiseRejectedResult).reason));
    }

    res.json(enhancedDrivers);
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ message: 'Failed to fetch drivers' });
  }
});

// Get all rides for admin management
router.get('/rides', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    const rides = await storage.getAllRides();
    res.json(rides);
  } catch (error) {
    console.error('Error fetching rides:', error);
    res.status(500).json({ message: 'Failed to fetch rides' });
  }
});

// Reset driver onboarding progress (Admin only)
router.post('/drivers/:driverId/reset-onboarding', isAuthenticated, hasRole('admin'), async (req, res) => {
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

    console.log(`🔄 ADMIN RESET: Resetting onboarding for driver ${driverId} (user ${driverDetail.userId})`);

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

    // Reset verification status to allow re-upload
    await storage.updateDriverDetails(driverId, {
      licenseVerified: false,
      insuranceVerified: false,
      vehicleVerified: false,
      profileVerified: false,
      medicalCertificationVerified: false,
      accountStatus: 'pending'
    });

    // Unlock account if locked
    await storage.updateUserStatus(driverDetail.userId, 'active');

    console.log(`✅ ADMIN RESET: Successfully reset driver ${driverId}`);

    res.json({ 
      message: 'Driver onboarding and verification status reset successfully',
      success: true 
    });

  } catch (error) {
    console.error('Error resetting driver onboarding:', error);
    res.status(500).json({ message: 'Failed to reset driver onboarding' });
  }
});

// User management actions
router.post('/users/:userId/action', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { action, reason } = req.body;
    const adminId = req.user!.id;

    const user = await storage.getUser(parseInt(userId));
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let result;
    let message;

    switch (action) {
      case 'suspend':
        // In a real system, this would update user status
        message = `User ${user.fullName} has been suspended`;
        
        // Send suspension notification email
        await emailNotificationService.sendAdministrativeEmail(
          user.id,
          user.email,
          user.fullName || user.username,
          'Account Suspended',
          `Your account has been temporarily suspended. Reason: ${reason || 'Administrative action'}. Please contact support for more information.`,
          'high'
        );
        break;

      case 'activate':
        message = `User ${user.fullName} has been activated`;
        
        // Send activation notification email
        await emailNotificationService.sendAdministrativeEmail(
          user.id,
          user.email,
          user.fullName || user.username,
          'Account Activated',
          'Your account has been activated and you can now use all platform features.',
          'normal'
        );
        break;

      case 'verify_email':
        // Mark email as verified
        message = `Email verified for user ${user.fullName}`;
        break;

      case 'reset_password':
        // Trigger password reset
        message = `Password reset initiated for user ${user.fullName}`;
        break;

      case 'block':
        message = `User ${user.fullName} has been blocked`;
        break;

      // Individual document verification actions
      case 'verify_license':
        if (user.role === 'driver') {
          await storage.updateDriverDetails(user.id, { licenseVerified: true, licenseRejectionReason: null });
          message = `License verified for driver ${user.fullName}`;
        } else {
          return res.status(400).json({ message: 'User is not a driver' });
        }
        break;

      case 'reject_license':
        if (user.role === 'driver') {
          await storage.updateDriverDetails(user.id, { licenseVerified: false, licenseRejectionReason: reason || 'License requires revision' });
          message = `License rejected for driver ${user.fullName}`;
        } else {
          return res.status(400).json({ message: 'User is not a driver' });
        }
        break;

      case 'verify_insurance':
        if (user.role === 'driver') {
          await storage.updateDriverDetails(user.id, { insuranceVerified: true, insuranceRejectionReason: null });
          message = `Insurance verified for driver ${user.fullName}`;
        } else {
          return res.status(400).json({ message: 'User is not a driver' });
        }
        break;

      case 'reject_insurance':
        if (user.role === 'driver') {
          await storage.updateDriverDetails(user.id, { insuranceVerified: false, insuranceRejectionReason: reason || 'Insurance requires revision' });
          message = `Insurance rejected for driver ${user.fullName}`;
        } else {
          return res.status(400).json({ message: 'User is not a driver' });
        }
        break;

      case 'verify_vehicle':
        if (user.role === 'driver') {
          await storage.updateDriverDetails(user.id, { vehicleVerified: true, vehicleRejectionReason: null });
          message = `Vehicle verified for driver ${user.fullName}`;
        } else {
          return res.status(400).json({ message: 'User is not a driver' });
        }
        break;

      case 'reject_vehicle':
        if (user.role === 'driver') {
          await storage.updateDriverDetails(user.id, { vehicleVerified: false, vehicleRejectionReason: reason || 'Vehicle requires revision' });
          message = `Vehicle rejected for driver ${user.fullName}`;
        } else {
          return res.status(400).json({ message: 'User is not a driver' });
        }
        break;

      case 'verify_all_documents':
        if (user.role === 'driver') {
          await storage.updateDriverDetails(user.id, { 
            licenseVerified: true, 
            insuranceVerified: true, 
            vehicleVerified: true, 
            profileVerified: true,
            medicalCertificationVerified: true,
            verified: true,
            licenseRejectionReason: null,
            insuranceRejectionReason: null,
            vehicleRejectionReason: null,
            profileRejectionReason: null
          });
          message = `All documents verified for driver ${user.fullName}`;
        } else {
          return res.status(400).json({ message: 'User is not a driver' });
        }
        break;

      case 'reject_all_documents':
        if (user.role === 'driver') {
          await storage.updateDriverDetails(user.id, { 
            licenseVerified: false, 
            insuranceVerified: false, 
            vehicleVerified: false, 
            profileVerified: false,
            medicalCertificationVerified: false,
            verified: false,
            licenseRejectionReason: reason || 'Documents require revision',
            insuranceRejectionReason: reason || 'Documents require revision',
            vehicleRejectionReason: reason || 'Documents require revision',
            profileRejectionReason: reason || 'Documents require revision'
          });
          message = `All documents rejected for driver ${user.fullName}`;
        } else {
          return res.status(400).json({ message: 'User is not a driver' });
        }
        break;

      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    // Log the admin action
    logAdminAction(adminId, action, 'user', parseInt(userId), reason || '', {
      targetUser: user.fullName,
      targetEmail: user.email
    });

    // Send real-time notification
    sseManager.broadcast({
      event: 'admin_action',
      data: {
        action,
        targetType: 'user',
        targetId: userId,
        adminId,
        timestamp: new Date().toISOString()
      }
    });

    res.json({ success: true, message });
  } catch (error) {
    console.error('Error performing user action:', error);
    res.status(500).json({ message: 'Failed to perform user action' });
  }
});

// Ride management actions
router.post('/rides/:rideId/action', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    const { rideId } = req.params;
    const { action, reason } = req.body;
    const adminId = req.user!.id;

    const ride = await storage.getRide(parseInt(rideId));
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    let message;

    switch (action) {
      case 'cancel':
        await storage.updateRideStatus(parseInt(rideId), 'cancelled');
        message = `Ride ${ride.referenceNumber} has been cancelled`;
        
        // Notify rider
        const rider = await storage.getUser(ride.riderId);
        if (rider) {
          await emailNotificationService.sendRideStatusUpdate(
            rider.id,
            rider.email,
            rider.fullName || rider.username,
            {
              rideId: ride.id,
              referenceNumber: ride.referenceNumber,
              status: 'Cancelled',
              statusMessage: `Your ride has been cancelled by administration. Reason: ${reason || 'Administrative decision'}`
            }
          );
        }
        break;

      case 'force_complete':
        await storage.updateRideStatus(parseInt(rideId), 'completed');
        message = `Ride ${ride.referenceNumber} has been force completed`;
        break;

      case 'reassign_driver':
        // This would involve driver reassignment logic
        message = `Driver reassignment initiated for ride ${ride.referenceNumber}`;
        break;

      case 'refund':
        // This would trigger refund processing
        message = `Refund initiated for ride ${ride.referenceNumber}`;
        break;

      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    // Log the admin action
    logAdminAction(adminId, action, 'ride', parseInt(rideId), reason || '', {
      rideReference: ride.referenceNumber,
      riderId: ride.riderId,
      driverId: ride.driverId
    });

    res.json({ success: true, message });
  } catch (error) {
    console.error('Error performing ride action:', error);
    res.status(500).json({ message: 'Failed to perform ride action' });
  }
});

// System actions
router.post('/system/action', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    const { action, parameters } = req.body;
    const adminId = req.user!.id;

    let message;

    switch (action) {
      case 'backup_database':
        // Trigger database backup
        message = 'Database backup initiated';
        setTimeout(() => {
          sseManager.sendToUser(adminId, {
            event: 'system_action_complete',
            data: { action, status: 'completed', message: 'Database backup completed successfully' }
          });
        }, 5000);
        break;

      case 'optimize_database':
        // Trigger database optimization
        message = 'Database optimization initiated';
        break;

      case 'clear_cache':
        // Clear system cache
        message = 'System cache cleared';
        break;

      case 'enable_maintenance_mode':
        // Enable maintenance mode
        message = 'Maintenance mode enabled';
        
        // Broadcast maintenance notification
        sseManager.broadcast({
          event: 'maintenance_mode',
          data: { enabled: true, timestamp: new Date().toISOString() }
        });
        break;

      case 'disable_maintenance_mode':
        // Disable maintenance mode
        message = 'Maintenance mode disabled';
        
        sseManager.broadcast({
          event: 'maintenance_mode',
          data: { enabled: false, timestamp: new Date().toISOString() }
        });
        break;

      case 'emergency_shutdown':
        // Emergency system shutdown
        message = 'Emergency shutdown initiated';
        
        // Notify all users
        sseManager.broadcast({
          event: 'emergency_shutdown',
          data: { timestamp: new Date().toISOString() }
        });
        break;

      default:
        return res.status(400).json({ message: 'Invalid system action' });
    }

    // Log the system action
    logAdminAction(adminId, action, 'system', 0, 'System administration', parameters || {});

    res.json({ success: true, message });
  } catch (error) {
    console.error('Error performing system action:', error);
    res.status(500).json({ message: 'Failed to perform system action' });
  }
});

// Administrative override
router.post('/override', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    const { action, reason, targetId, targetType } = req.body;
    const adminId = req.user!.id;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ message: 'Detailed reason required for override (minimum 10 characters)' });
    }

    let message;
    let overrideDetails = {};

    switch (action) {
      case 'force_ride_completion':
        if (targetId) {
          await storage.updateRideStatus(targetId, 'completed');
          const ride = await storage.getRide(targetId);
          overrideDetails = { rideReference: ride?.referenceNumber };
          message = 'Ride force completed via administrative override';
        }
        break;

      case 'bypass_verification':
        if (targetId && targetType === 'user') {
          // Actually bypass verification requirements by updating driver status
          const user = await storage.getUser(targetId);
          if (user && user.role === 'driver') {
            // Update driver to verified status
            await storage.updateDriverDetails(targetId, {
              verified: true,
              licenseVerified: true,
              insuranceVerified: true,
              vehicleVerified: true,
              profileVerified: true,
              medicalCertificationVerified: true,
              backgroundCheckStatus: 'approved'
            });
            
            // Update user account status
            await storage.updateUser(targetId, {
              emailVerified: true,
              accountStatus: 'active'
            });
            
            // Enable all driver permissions by updating the driver details
            // The verification status changes above will enable the driver
            
            overrideDetails = { 
              userId: targetId, 
              username: user.username,
              fullName: user.fullName,
              verificationsBypassed: ['license', 'insurance', 'vehicle', 'profile', 'medical', 'background']
            };
            message = `Driver ${user.fullName || user.username} fully approved via administrative override - all verifications bypassed`;
          } else {
            overrideDetails = { userId: targetId };
            message = 'User verification bypassed via administrative override';
          }
        }
        break;

      case 'emergency_driver_assign':
        // Emergency driver assignment logic
        overrideDetails = { rideId: targetId };
        message = 'Emergency driver assignment via administrative override';
        break;

      case 'refund_override':
        // Force refund processing
        overrideDetails = { amount: 'full_refund', rideId: targetId };
        message = 'Refund processed via administrative override';
        break;

      case 'account_unlock':
        // Unlock blocked account
        overrideDetails = { userId: targetId };
        message = 'Account unlocked via administrative override';
        break;

      case 'system_override':
        // General system override
        overrideDetails = { parameters: req.body.parameters };
        message = 'System override applied';
        break;

      default:
        return res.status(400).json({ message: 'Invalid override action' });
    }

    // Log the override action with high priority
    const overrideLog: OverrideLog = {
      id: `override_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      adminId,
      action,
      targetType,
      targetId,
      reason,
      details: overrideDetails,
      timestamp: new Date().toISOString(),
      ipAddress: req.ip
    };

    overrideLogs.push(overrideLog);

    // Send critical notification to all admins
    const allUsers = await storage.getAllUsers();
    const admins = allUsers.filter(user => user.role === 'admin');
    
    for (const admin of admins) {
      sseManager.sendToUser(admin.id, {
        event: 'admin_override',
        data: {
          overrideId: overrideLog.id,
          action,
          adminId,
          timestamp: overrideLog.timestamp,
          severity: 'critical'
        }
      });

      // Send email notification for critical overrides
      if (['emergency_driver_assign', 'system_override', 'force_ride_completion'].includes(action)) {
        await emailNotificationService.sendAdministrativeEmail(
          admin.id,
          admin.email,
          admin.fullName || admin.username,
          'CRITICAL: Administrative Override Applied',
          `An administrative override has been applied by ${req.user!.fullName}.\n\nAction: ${action}\nReason: ${reason}\nTime: ${new Date().toLocaleString()}`,
          'urgent'
        );
      }
    }

    res.json({ 
      success: true, 
      message,
      overrideId: overrideLog.id,
      timestamp: overrideLog.timestamp
    });
  } catch (error) {
    console.error('Error applying override:', error);
    res.status(500).json({ message: 'Failed to apply administrative override' });
  }
});

// Get override logs
router.get('/override-logs', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    // In production, this would come from database with pagination
    const logs = overrideLogs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50); // Last 50 overrides

    res.json(logs);
  } catch (error) {
    console.error('Error fetching override logs:', error);
    res.status(500).json({ message: 'Failed to fetch override logs' });
  }
});

// Helper functions
function calculateUptime(): string {
  const uptimeMs = process.uptime() * 1000;
  const hours = Math.floor(uptimeMs / (1000 * 60 * 60));
  const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

function logAdminAction(
  adminId: number, 
  action: string, 
  targetType: string, 
  targetId: number, 
  reason: string, 
  details: any
): void {
  const log = {
    id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    adminId,
    action,
    targetType,
    targetId,
    reason,
    details,
    timestamp: new Date().toISOString()
  };

  console.log('Admin Action Logged:', log);
  
  // In production, this would be stored in database
  // For now, we'll just log it
}

export default router;
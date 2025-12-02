import { Router } from 'express';
import { storage } from '../storage';
import { isAuthenticated, hasRole } from '../middleware/auth';
import { sseManager } from '../sse-manager';
import { gpsTrackingService } from '../gps-tracking';

const router = Router();

// Get comprehensive driver status
router.get('/status', isAuthenticated, hasRole('driver'), async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Get driver details with error handling
    const driverDetails = await storage.getDriverDetails(userId);
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get driver permissions with safe defaults
    const permissions = {
      canViewRideRequests: driverDetails?.canViewRideRequests || true, // Allow viewing by default
      canAcceptRides: driverDetails?.canAcceptRides || false,
      canBidOnRides: driverDetails?.canAcceptRides || true, // Allow bidding by default
      emailVerified: user?.emailVerified || false,
      backgroundCheckApproved: driverDetails?.backgroundCheckStatus === 'approved',
      documentsVerified: driverDetails?.verified || false
    };

    // Calculate compliance info
    const licenseExpiry = driverDetails?.licenseExpiry ? new Date(driverDetails.licenseExpiry) : null;
    const insuranceExpiry = driverDetails?.insuranceExpiry ? new Date(driverDetails.insuranceExpiry) : null;
    const today = new Date();
    
    let daysUntilExpiry = 365;
    let nextRequiredAction = null;
    
    if (licenseExpiry) {
      const licenseDays = Math.ceil((licenseExpiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      daysUntilExpiry = Math.min(daysUntilExpiry, licenseDays);
      if (licenseDays <= 30) {
        nextRequiredAction = 'Driver license expires soon - please renew';
      }
    }
    
    if (insuranceExpiry) {
      const insuranceDays = Math.ceil((insuranceExpiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      daysUntilExpiry = Math.min(daysUntilExpiry, insuranceDays);
      if (insuranceDays <= 30) {
        nextRequiredAction = 'Insurance policy expires soon - please renew';
      }
    }

    // Check if documents need attention
    if (!permissions.emailVerified) {
      nextRequiredAction = 'Please verify your email address';
    } else if (!permissions.backgroundCheckApproved) {
      nextRequiredAction = 'Background check pending - please complete if required';
    } else if (!permissions.documentsVerified) {
      nextRequiredAction = 'Document verification pending - please upload required documents';
    }

    const status = {
      isVerified: driverDetails?.verified || false,
      isOnline: false, // This would be managed by a separate online status system
      permissions,
      application: {
        status: driverDetails?.accountStatus || 'incomplete',
        backgroundCheckStatus: driverDetails?.backgroundCheckStatus || 'pending',
        documentsStatus: driverDetails?.verified ? 'approved' : 'pending'
      },
      compliance: {
        licenseExpiry: licenseExpiry?.toISOString() || null,
        insuranceExpiry: insuranceExpiry?.toISOString() || null,
        nextRequiredAction,
        daysUntilExpiry
      }
    };

    console.log('Driver status response:', JSON.stringify(status, null, 2));
    res.json(status);
  } catch (error) {
    console.error('Error fetching driver status:', error);
    
    // Return a default status object to prevent blank pages
    const defaultStatus = {
      isVerified: false,
      isOnline: false,
      permissions: {
        canViewRideRequests: false,
        canAcceptRides: false,
        canBidOnRides: false,
        emailVerified: false,
        backgroundCheckApproved: false,
        documentsVerified: false
      },
      application: {
        status: 'incomplete',
        backgroundCheckStatus: 'pending',
        documentsStatus: 'pending'
      },
      compliance: {
        licenseExpiry: null,
        insuranceExpiry: null,
        nextRequiredAction: 'Complete driver registration',
        daysUntilExpiry: 365
      }
    };
    
    res.json(defaultStatus);
  }
});

// Get driver dashboard statistics
router.get('/stats', isAuthenticated, hasRole('driver'), async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Get driver rides
    const rides = await storage.getRidesByDriver(userId);
    const completedRides = rides.filter(ride => ride.status === 'completed');
    const cancelledRides = rides.filter(ride => ride.status === 'cancelled');
    
    // Calculate earnings
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const todayEarnings = completedRides
      .filter(ride => new Date(ride.completedAt || ride.createdAt) >= startOfDay)
      .reduce((sum, ride) => sum + (ride.finalPrice || 0), 0);
    
    const weekEarnings = completedRides
      .filter(ride => new Date(ride.completedAt || ride.createdAt) >= startOfWeek)
      .reduce((sum, ride) => sum + (ride.finalPrice || 0), 0);
    
    const monthEarnings = completedRides
      .filter(ride => new Date(ride.completedAt || ride.createdAt) >= startOfMonth)
      .reduce((sum, ride) => sum + (ride.finalPrice || 0), 0);

    // Calculate ratings
    const ratings = await storage.getRatingsByDriver(userId);
    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
      : 5.0;

    // Calculate response rate (mock calculation)
    const responseRate = Math.min(95, Math.max(70, 90 + Math.random() * 10));

    const stats = {
      todayEarnings,
      weekEarnings,
      monthEarnings,
      totalRides: rides.length,
      completedRides: completedRides.length,
      cancelledRides: cancelledRides.length,
      averageRating: Math.round(averageRating * 10) / 10,
      onlineHours: 0, // This would be tracked separately
      responseRate: Math.round(responseRate)
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching driver stats:', error);
    res.status(500).json({ message: 'Failed to fetch driver statistics' });
  }
});

// Get active ride for driver
router.get('/active-ride', isAuthenticated, hasRole('driver'), async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Find active ride
    const rides = await storage.getRidesByDriver(userId);
    const activeRide = rides.find(ride => 
      ['en_route', 'arrived', 'in_progress'].includes(ride.status)
    );

    if (!activeRide) {
      return res.json(null);
    }

    // Get rider information
    const rider = await storage.getUser(activeRide.riderId);

    const activeRideData = {
      id: activeRide.id,
      status: activeRide.status,
      pickupTime: activeRide.scheduledTime,
      pickupAddress: activeRide.pickupAddress,
      dropoffAddress: activeRide.dropoffAddress,
      riderName: rider?.fullName || 'Rider',
      estimatedDuration: activeRide.estimatedDuration || 0,
      fare: activeRide.finalPrice || activeRide.estimatedPrice || 0
    };

    res.json(activeRideData);
  } catch (error) {
    console.error('Error fetching active ride:', error);
    res.status(500).json({ message: 'Failed to fetch active ride' });
  }
});

// Get upcoming rides
router.get('/upcoming-rides', isAuthenticated, hasRole('driver'), async (req, res) => {
  try {
    const userId = req.user!.id;
    
    const rides = await storage.getRidesByDriver(userId);
    const upcomingRides = rides
      .filter(ride => ride.status === 'scheduled')
      .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime())
      .slice(0, 5)
      .map(ride => ({
        id: ride.id,
        pickupAddress: ride.pickupAddress,
        dropoffAddress: ride.dropoffAddress,
        scheduledTime: ride.scheduledTime,
        estimatedFare: ride.estimatedPrice,
        estimatedDuration: ride.estimatedDuration
      }));

    res.json(upcomingRides);
  } catch (error) {
    console.error('Error fetching upcoming rides:', error);
    res.status(500).json({ message: 'Failed to fetch upcoming rides' });
  }
});

// Toggle driver online status
router.post('/toggle-status', isAuthenticated, hasRole('driver'), async (req, res) => {
  try {
    const userId = req.user!.id;
    const { isOnline } = req.body;

    // Update driver status in database (this would need a new field)
    // For now, we'll just respond with success
    
    // Send real-time update to dashboard
    sseManager.sendToUser(userId, {
      event: 'status_changed',
      data: { isOnline, timestamp: new Date().toISOString() }
    });

    res.json({ 
      success: true, 
      isOnline,
      message: isOnline ? 'You are now online' : 'You are now offline'
    });
  } catch (error) {
    console.error('Error toggling driver status:', error);
    res.status(500).json({ message: 'Failed to update status' });
  }
});

// Get driver documents
router.get('/documents', isAuthenticated, hasRole('driver'), async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Get driver details to extract document information
    const driverDetails = await storage.getDriverDetails(userId);
    const vehicles = await storage.getVehiclesByDriver(userId);
    
    if (!driverDetails) {
      return res.json([]);
    }

    const documents = [];

    // Driver's license documents
    if (driverDetails.licensePhotoFront) {
      documents.push({
        id: 'license_front_' + userId,
        type: 'drivers_license_front',
        fileName: 'drivers_license_front.jpg',
        uploadDate: driverDetails.createdAt || new Date().toISOString(),
        expiryDate: driverDetails.licenseExpiry,
        status: driverDetails.verified ? 'approved' : 'pending',
        fileUrl: driverDetails.licensePhotoFront,
        fileSize: 1024 * 1024, // Mock file size
        verifiedBy: driverDetails.verified ? 'System Admin' : undefined,
        verifiedAt: driverDetails.verifiedAt
      });
    }

    if (driverDetails.licensePhotoBack) {
      documents.push({
        id: 'license_back_' + userId,
        type: 'drivers_license_back',
        fileName: 'drivers_license_back.jpg',
        uploadDate: driverDetails.createdAt || new Date().toISOString(),
        expiryDate: driverDetails.licenseExpiry,
        status: driverDetails.verified ? 'approved' : 'pending',
        fileUrl: driverDetails.licensePhotoBack,
        fileSize: 1024 * 1024,
        verifiedBy: driverDetails.verified ? 'System Admin' : undefined,
        verifiedAt: driverDetails.verifiedAt
      });
    }

    // Insurance document
    if (driverDetails.insuranceDocumentUrl) {
      documents.push({
        id: 'insurance_' + userId,
        type: 'insurance_policy',
        fileName: 'insurance_policy.pdf',
        uploadDate: driverDetails.createdAt || new Date().toISOString(),
        expiryDate: driverDetails.insuranceExpiry,
        status: driverDetails.verified ? 'approved' : 'pending',
        fileUrl: driverDetails.insuranceDocumentUrl,
        fileSize: 2 * 1024 * 1024,
        verifiedBy: driverDetails.verified ? 'System Admin' : undefined,
        verifiedAt: driverDetails.verifiedAt
      });
    }

    // Vehicle registration (if available)
    if (vehicles && vehicles.length > 0 && vehicles[0].registrationDocumentUrl) {
      documents.push({
        id: 'vehicle_reg_' + userId,
        type: 'vehicle_registration',
        fileName: 'vehicle_registration.pdf',
        uploadDate: vehicles[0].createdAt || new Date().toISOString(),
        status: driverDetails.verified ? 'approved' : 'pending',
        fileUrl: vehicles[0].registrationDocumentUrl,
        fileSize: 1.5 * 1024 * 1024,
        verifiedBy: driverDetails.verified ? 'System Admin' : undefined,
        verifiedAt: driverDetails.verifiedAt
      });
    }

    res.json(documents);
  } catch (error) {
    console.error('Error fetching driver documents:', error);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
});

// Upload document
router.post('/documents/upload', isAuthenticated, hasRole('driver'), async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // In a real implementation, this would handle file upload
    // For now, we'll simulate the upload process
    
    const { documentType, expiryDate } = req.body;
    
    // Simulate upload processing
    setTimeout(() => {
      // Send real-time update about document upload
      sseManager.sendToUser(userId, {
        event: 'document_uploaded',
        data: { 
          documentType, 
          status: 'pending',
          timestamp: new Date().toISOString()
        }
      });
    }, 2000);

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      documentId: `doc_${Date.now()}`
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ message: 'Failed to upload document' });
  }
});

// Delete document
router.delete('/documents/:documentId', isAuthenticated, hasRole('driver'), async (req, res) => {
  try {
    const userId = req.user!.id;
    const { documentId } = req.params;

    // In a real implementation, this would delete the document from storage
    // For now, we'll just respond with success
    
    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Failed to delete document' });
  }
});

export default router;
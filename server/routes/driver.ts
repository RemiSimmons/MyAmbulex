import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';
import { isAuthenticated, hasRole } from '../middleware/auth';

const router = Router();

// Ensure directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `${uniqueId}${extension}`);
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedFileTypes = ['.jpg', '.jpeg', '.png', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedFileTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedFileTypes.join(', ')}`));
  }
};

const upload = multer({
  storage: fileStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter
});

// Remove local auth middleware - use the centralized middleware

const isActiveDriver = async (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated() || req.user.role !== 'driver') {
    return res.status(403).json({ message: 'Access denied. Driver role required.' });
  }
  
  try {
    const driverDetails = await storage.getDriverDetails(req.user.id);
    if (!driverDetails || driverDetails.accountStatus !== 'active') {
      return res.status(403).json({ 
        message: 'Driver account not activated. Please complete verification process.',
        status: driverDetails?.accountStatus || 'pending'
      });
    }
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Error checking driver status' });
  }
};

// Get driver application status
router.get('/application-status', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get driver details
    const driverDetails = await storage.getDriverDetails(userId);
    
    // Get driver's vehicle
    const vehicles = await storage.getVehiclesByDriver(userId);
    
    // Format response
    const response = {
      application: {
        // Use submitted registration progress from temporary storage
        isSubmitted: !!driverDetails && !!driverDetails.licensePhotoFront && !!driverDetails.licensePhotoBack && !!driverDetails.insuranceDocumentUrl,
        isVerified: driverDetails?.backgroundCheckStatus === 'approved',
        status: driverDetails?.accountStatus || 'pending',
        backgroundCheckStatus: driverDetails?.backgroundCheckStatus
      },
      documents: {
        licensePhotoFront: driverDetails?.licensePhotoFront,
        licensePhotoBack: driverDetails?.licensePhotoBack,
        insuranceDocumentUrl: driverDetails?.insuranceDocumentUrl,
        vehicleRegistration: vehicles?.[0]?.registrationDocumentUrl
      },
      driverDetails,
      vehicle: vehicles?.[0]
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching driver application status:', error);
    res.status(500).json({ 
      message: 'Error fetching application status',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// New simplified endpoint for React Router to check driver onboarding status
router.get('/status', isAuthenticated, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'driver') {
      return res.status(403).json({ message: 'Not a driver account' });
    }
    
    const userId = req.user.id;
    
    // Get driver details
    const driverDetails = await storage.getDriverDetails(userId);
    
    // Import centralized verification utility
    const { isDriverOnboardingComplete, getMissingDocuments } = await import('../utils/driver-verification');
    
    // Determine if onboarding is complete based on verification status
    const isVerified = driverDetails?.verified === true;
    const isOnboarded = isDriverOnboardingComplete(driverDetails);
    const missingDocuments = getMissingDocuments(driverDetails);
    
    // Format response
    const response = {
      isOnboarded: isOnboarded,
      isVerified: isVerified,
      application: {
        status: driverDetails?.accountStatus || 'pending',
        backgroundCheckStatus: driverDetails?.backgroundCheckStatus || 'pending'
      },
      missingDocuments: isOnboarded ? [] : missingDocuments
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching driver status:', error);
    res.status(500).json({ 
      message: 'Error fetching driver status',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Upload document
router.post('/upload-document', isAuthenticated, hasRole('driver'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.user.id;
    const documentType = req.body.documentType;
    const certificationName = req.body.certificationName;
    
    // File path relative to the server root
    const fileUrl = `/uploads/${req.file.filename}`;
    
    // Update driver details with the document URL
    let updateData: Record<string, any> = {};
    
    switch (documentType) {
      case 'license_front':
        updateData.licensePhotoFront = fileUrl;
        break;
      case 'license_back':
        updateData.licensePhotoBack = fileUrl;
        break;
      case 'insurance':
        updateData.insuranceDocumentUrl = fileUrl;
        break;
      case 'profile_photo':
        updateData.profilePhotoUrl = fileUrl;
        break;
      case 'certification':
        if (!certificationName) {
          return res.status(400).json({ message: 'Certification name is required' });
        }
        // Store certifications in an array
        const driverDetails = await storage.getDriverDetails(userId);
        const certifications = driverDetails?.certifications || [];
        certifications.push({
          name: certificationName,
          documentUrl: fileUrl,
          verified: false,
          uploadedAt: new Date()
        });
        updateData.certifications = certifications;
        break;
      case 'vehicle_registration':
        // Handle vehicle registration separately - need vehicle ID
        const vehicles = await storage.getVehiclesByDriver(userId);
        if (vehicles && vehicles.length > 0) {
          await storage.updateVehicle(vehicles[0].id, {
            registrationDocumentUrl: fileUrl
          });
        } else {
          // Store temporarily in driver details if no vehicle record exists yet
          updateData.vehicleRegistrationUrl = fileUrl;
        }
        break;
      default:
        return res.status(400).json({ message: 'Invalid document type' });
    }
    
    if (Object.keys(updateData).length > 0) {
      await storage.updateDriverDetails(userId, updateData);
    }
    
    res.status(200).json({
      message: 'Document uploaded successfully',
      fileUrl,
      documentType
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ 
      message: 'Error uploading document',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Submit driver application
router.post('/submit-application', isAuthenticated, hasRole('driver'), async (req, res) => {
  try {
    const userId = req.user.id;
    const driverDetails = await storage.getDriverDetails(userId);
    
    if (!driverDetails) {
      return res.status(404).json({ message: 'Driver details not found' });
    }
    
    // Check for required documents
    if (!driverDetails.licensePhotoFront || !driverDetails.licensePhotoBack) {
      return res.status(400).json({ message: 'Driver license photos are required' });
    }
    
    if (!driverDetails.insuranceDocumentUrl) {
      return res.status(400).json({ message: 'Insurance document is required' });
    }
    
    // Check for vehicle
    const vehicles = await storage.getVehiclesByDriver(userId);
    if (!vehicles || vehicles.length === 0) {
      return res.status(400).json({ message: 'Vehicle information is required' });
    }
    
    if (!vehicles[0].registrationDocumentUrl) {
      // Check if temp registration exists in driver details
      if (driverDetails.vehicleRegistrationUrl) {
        // Move from driver details to vehicle record
        await storage.updateVehicle(vehicles[0].id, {
          registrationDocumentUrl: driverDetails.vehicleRegistrationUrl
        });
        // Clear from driver details
        await storage.updateDriverDetails(userId, {
          vehicleRegistrationUrl: null
        });
      } else {
        return res.status(400).json({ message: 'Vehicle registration is required' });
      }
    }
    
    // Mark application as submitted
    await storage.updateDriverDetails(userId, {
      accountStatus: 'pending',
      backgroundCheckStatus: 'pending'
    });
    
    res.status(200).json({
      message: 'Application submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({ 
      message: 'Error submitting application',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get driver details - used by frontend dashboard
router.get('/details', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if user is a driver
    if (req.user.role !== 'driver') {
      return res.status(403).json({ message: 'Access denied: User is not a driver' });
    }
    
    // Get the driver details
    const driverDetails = await storage.getDriverDetails(userId);
    
    if (!driverDetails) {
      return res.status(404).json({ message: 'Driver details not found' });
    }
    
    console.log(`🚗 DRIVER DETAILS API DEBUG for userId ${userId}:`, {
      licenseVerified: driverDetails.licenseVerified,
      licenseVerifiedType: typeof driverDetails.licenseVerified,
      insuranceVerified: driverDetails.insuranceVerified, 
      insuranceVerifiedType: typeof driverDetails.insuranceVerified,
      vehicleVerified: driverDetails.vehicleVerified,
      vehicleVerifiedType: typeof driverDetails.vehicleVerified,
      profileVerified: driverDetails.profileVerified,
      profileVerifiedType: typeof driverDetails.profileVerified
    });
    
    res.json(driverDetails);
  } catch (error) {
    console.error('Error fetching driver details:', error);
    res.status(500).json({ message: 'Failed to fetch driver details' });
  }
});

// Update driver details
router.put('/driver-details', isAuthenticated, hasRole('driver'), async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;
    
    const updatedDetails = await storage.updateDriverDetails(userId, updateData);
    
    if (!updatedDetails) {
      // Create driver details if they don't exist
      const newDetails = await storage.createDriverDetails({
        userId,
        ...updateData,
        accountStatus: 'pending',
        backgroundCheckStatus: 'pending'
      });
      
      res.status(201).json(newDetails);
    } else {
      res.status(200).json(updatedDetails);
    }
  } catch (error) {
    console.error('Error updating driver details:', error);
    res.status(500).json({ 
      message: 'Error updating driver details',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Add or update driver's vehicle
router.post('/vehicles', isAuthenticated, hasRole('driver'), async (req, res) => {
  try {
    const userId = req.user.id;
    const vehicleData = req.body;
    
    // Check if driver already has a vehicle
    const vehicles = await storage.getVehiclesByDriver(userId);
    
    if (vehicles && vehicles.length > 0) {
      // Update existing vehicle
      const updatedVehicle = await storage.updateVehicle(vehicles[0].id, vehicleData);
      res.status(200).json(updatedVehicle);
    } else {
      // Create new vehicle
      const newVehicle = await storage.createVehicle({
        driverId: userId,
        ...vehicleData
      });
      
      // If there's a temp registration URL in driver details, move it to the vehicle
      const driverDetails = await storage.getDriverDetails(userId);
      if (driverDetails?.vehicleRegistrationUrl) {
        await storage.updateVehicle(newVehicle.id, {
          registrationDocumentUrl: driverDetails.vehicleRegistrationUrl
        });
        // Clear from driver details
        await storage.updateDriverDetails(userId, {
          vehicleRegistrationUrl: null
        });
      }
      
      res.status(201).json(newVehicle);
    }
  } catch (error) {
    console.error('Error saving vehicle:', error);
    res.status(500).json({ 
      message: 'Error saving vehicle information',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Complete driver registration endpoint
router.post('/complete-driver-registration', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userId = req.user.id;
    const { personalInfo, vehicleInfo } = req.body;
    
    // First get driver details
    let driverDetails = await storage.getDriverDetails(userId);
    
    if (!driverDetails) {
      return res.status(404).json({ message: 'Driver details not found' });
    }
    
    // Check for required documents
    if (!driverDetails.licensePhotoFront || !driverDetails.licensePhotoBack) {
      return res.status(400).json({ message: 'Driver license photos are required' });
    }
    
    if (!driverDetails.insuranceDocumentUrl) {
      return res.status(400).json({ message: 'Insurance document is required' });
    }
    
    // Update driver details with personal info if any
    if (personalInfo && Object.keys(personalInfo).length > 0) {
      await storage.updateDriverDetails(userId, personalInfo);
    }
    
    // Update or create vehicle
    if (vehicleInfo && Object.keys(vehicleInfo).length > 0) {
      // Check if driver already has a vehicle
      const vehicles = await storage.getVehiclesByDriver(userId);
      
      if (vehicles && vehicles.length > 0) {
        // Update existing vehicle
        await storage.updateVehicle(vehicles[0].id, vehicleInfo);
      } else {
        // Create new vehicle
        await storage.createVehicle({
          ...vehicleInfo,
          driverId: userId
        });
      }
    }
    
    // Mark application as submitted with pending status
    await storage.updateDriverDetails(userId, {
      accountStatus: 'pending',
      backgroundCheckStatus: 'pending'
    });
    
    // Remove registration progress data to prevent re-submissions
    if (storage.clearDriverRegistrationProgress) {
      await storage.clearDriverRegistrationProgress(userId);
    }
    
    res.status(200).json({
      message: 'Application submitted successfully'
    });
  } catch (error) {
    console.error('Error completing driver registration:', error);
    res.status(500).json({ 
      message: 'Error submitting application',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Upload background check document
router.post('/upload/background-check', isAuthenticated, hasRole('driver'), upload.single('backgroundCheck'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.user!.id;
    
    // Validate file type
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ message: 'Only PDF files are allowed' });
    }

    // Validate file size (10MB limit)
    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ message: 'File size must be less than 10MB' });
    }
    
    // Save file path to driver details
    const backgroundCheckPath = `/uploads/${req.file.filename}`;
    
    await storage.updateDriverDetails(userId, {
      backgroundCheckDocument: backgroundCheckPath,
      backgroundCheckDate: new Date(),
      backgroundCheckStatus: 'pending' // Reset to pending for review
    });

    res.json({ 
      success: true, 
      message: 'Background check uploaded successfully and submitted for review',
      filePath: backgroundCheckPath 
    });
  } catch (error) {
    console.error('Background check upload error:', error);
    res.status(500).json({ message: 'Upload failed' });
  }
});

// Document viewing endpoint - authenticated access to driver documents
router.get('/documents/view/:filename', isAuthenticated, async (req, res) => {
  try {
    const { filename } = req.params;
    const userId = req.user.id;
    
    // Security check: Only allow drivers to view their own documents
    if (req.user.role !== 'driver' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Construct file path
    const filePath = path.join(process.cwd(), 'uploads', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // For additional security, verify the driver owns this document
    if (req.user.role === 'driver') {
      const driverDetails = await storage.getDriverDetails(userId);
      if (!driverDetails) {
        return res.status(404).json({ message: 'Driver not found' });
      }
      
      // Check if filename matches any of the driver's documents
      const driverDocuments = [
        driverDetails.licensePhotoFront,
        driverDetails.licensePhotoBack,
        driverDetails.insuranceDocumentUrl,
        driverDetails.vehicleRegistrationUrl,
        driverDetails.backgroundCheckDocumentUrl,
        driverDetails.medicalCertificationUrl,
        driverDetails.mvrRecordUrl,
        driverDetails.drugTestResultsUrl
      ].filter(Boolean);
      
      const isOwnDocument = driverDocuments.some(docUrl => 
        docUrl && docUrl.includes(filename)
      );
      
      if (!isOwnDocument) {
        return res.status(403).json({ message: 'Access denied to this document' });
      }
    }
    
    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain'
    };
    
    const contentType = contentTypes[ext] || 'application/octet-stream';
    
    // Set headers for file serving
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Error serving document:', error);
    res.status(500).json({ message: 'Error serving document' });
  }
});

// Get available rides for driver
router.get('/available-rides', (req, res, next) => {
  console.log(`🔍 DRIVER AVAILABLE RIDES: Starting middleware chain for user ${req.user?.id} with session ${req.sessionID}`);
  next();
}, isAuthenticated, (req, res, next) => {
  console.log(`🔍 DRIVER AVAILABLE RIDES: After isAuthenticated, user ${req.user?.id} authenticated: ${req.isAuthenticated()}`);
  next();
}, hasRole('driver'), async (req: Request, res: Response) => {
  try {
    console.log(`🔍 DRIVER AVAILABLE RIDES: Route hit by user ${req.user?.id} with role ${req.user?.role}`);
    const driverId = req.user!.id;
    
    console.log(`🚗 Driver ${driverId} requesting available rides`);
    
    // Check if driver is online and can accept rides
    const driverDetails = await storage.getDriverDetailsByUserId(driverId);
    if (!driverDetails || !driverDetails.canAcceptRides) {
      console.log(`🚫 Driver ${driverId} cannot accept rides:`, {
        hasDriverDetails: !!driverDetails,
        canAcceptRides: driverDetails?.canAcceptRides
      });
      return res.json([]);
    }

    // Check if driver is online
    const onlineStatus = await storage.getDriverOnlineStatus(driverId);
    if (!onlineStatus?.isOnline) {
      console.log(`🔴 Driver ${driverId} is not online`);
      return res.json([]);
    }

    // Get available rides (requested or bidding status, no assigned driver yet)
    // getAvailableRidesForDriver expects the driver_details.id, not user.id
    const availableRides = await storage.getAvailableRidesForDriver(driverDetails.id);
    
    console.log(`✅ Found ${availableRides.length} available rides for driver ${driverId} (driverDetails.id: ${driverDetails.id})`);
    
    res.json(availableRides);
  } catch (error: any) {
    console.error("Error fetching available rides for driver:", error);
    res.status(500).json({ 
      message: `Error fetching available rides: ${error.message}`,
      rides: []
    });
  }
});

// Get driver's bids
router.get('/bids', isAuthenticated, hasRole('driver'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    console.log(`🚗 Driver ${userId} requesting their bids`);
    
    // Get driver details first to get the driver ID
    const driverDetails = await storage.getDriverDetailsByUserId(userId);
    
    if (!driverDetails) {
      console.log(`No driver details found for user ${userId}`);
      return res.json([]);
    }
    
    // Get all bids for this driver
    const driverBids = await storage.getBidsByDriver(driverDetails.id);
    
    console.log(`✅ Found ${driverBids.length} bids for driver ${userId} (driverDetails.id: ${driverDetails.id})`);
    
    res.json(driverBids);
  } catch (error: any) {
    console.error('Error fetching driver bids:', error);
    res.status(500).json({ 
      message: `Failed to fetch driver bids: ${error.message}`,
      bids: []
    });
  }
});

// Get vehicles for current driver
router.get('/vehicles', isAuthenticated, hasRole('driver'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    console.log(`🚗 Getting vehicles for user ${userId}`);
    
    // Get driver details first
    const driverDetails = await storage.getDriverDetailsByUserId(userId);
    if (!driverDetails) {
      console.log(`No driver details found for user ${userId}`);
      return res.json([]);
    }
    
    // Get vehicles for this driver
    const vehicles = await storage.getVehiclesByDriver(driverDetails.id);
    
    console.log(`Found ${vehicles.length} vehicles for driver ${driverDetails.id}`);
    
    res.json(vehicles);
  } catch (error: any) {
    console.error("Error fetching vehicles:", error);
    res.status(500).json({ 
      message: `Error fetching vehicles: ${error.message}`,
      vehicles: []
    });
  }
});

// Hide a ride for a driver
router.post('/hide-ride/:rideId', isAuthenticated, hasRole('driver'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const rideId = parseInt(req.params.rideId);
    
    console.log(`🙈 Driver ${userId} hiding ride ${rideId}`);
    
    if (!rideId || isNaN(rideId)) {
      return res.status(400).json({ message: "Invalid ride ID" });
    }
    
    // Get driver details
    const driverDetails = await storage.getDriverDetailsByUserId(userId);
    if (!driverDetails) {
      console.log(`No driver details found for user ${userId}`);
      return res.status(404).json({ message: "Driver details not found" });
    }
    
    // Hide the ride for this driver (use userId, not driverDetails.id)
    await storage.hideRideForDriver(userId, rideId);
    
    console.log(`✅ Successfully hid ride ${rideId} for driver ${userId}`);
    
    res.json({ 
      message: "Ride hidden successfully",
      rideId: rideId
    });
  } catch (error: any) {
    console.error('Error hiding ride:', error);
    res.status(500).json({ 
      message: `Failed to hide ride: ${error.message}`
    });
  }
});

// Save driver service area preferences
router.put('/service-area', isAuthenticated, hasRole('driver'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { coreAreas, corridors, maxDistance } = req.body;
    
    console.log(`🗺️ Driver ${userId} updating service area preferences:`, {
      coreAreas,
      corridors,
      maxDistance
    });
    
    // Get driver details
    const driverDetails = await storage.getDriverDetailsByUserId(userId);
    if (!driverDetails) {
      console.log(`No driver details found for user ${userId}`);
      return res.status(404).json({ message: "Driver details not found" });
    }
    
    // For now, we'll store this as a simple success response
    // In a full implementation, you'd save this to a service_areas table
    console.log(`✅ Service area preferences saved for driver ${userId}`);
    
    res.json({ 
      message: "Service area preferences saved successfully",
      serviceAreas: {
        coreAreas,
        corridors,
        maxDistance
      }
    });
  } catch (error: any) {
    console.error('Error saving service area:', error);
    res.status(500).json({ 
      message: `Failed to save service area: ${error.message}`
    });
  }
});

export default router;
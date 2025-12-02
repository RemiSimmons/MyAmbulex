import express from "express";
import { storage } from "../storage";
import { isAuthenticated, hasRole } from "../middleware/auth";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// Configure multer for file uploads
const uploadsDir = path.join(process.cwd(), "uploads");
// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Set up storage for uploaded files
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user?.id;
    const userDir = path.join(uploadsDir, `driver_${userId}`);
    
    // Create directory for this user if it doesn't exist
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename: timestamp + original file extension
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}_${uniqueSuffix}${ext}`);
  }
});

// File filter to restrict file types
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept images and PDFs
  if (
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/png" ||
    file.mimetype === "application/pdf"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, and PDF files are allowed."));
  }
};

const upload = multer({
  storage: fileStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
});

// Get driver registration progress
router.get("/registration-progress", isAuthenticated, hasRole('driver'), async (req, res) => {
  try {
    const driverId = req.user!.id;
    const progress = await storage.getDriverRegistrationProgress(driverId);
    
    res.json(progress || {
      step: 0,
      licenseUploaded: false,
      insuranceUploaded: false,
      vehicleRegistrationUploaded: false,
      backgroundCheckSubmitted: false,
      profileCompleted: false,
      vehicleDetailsCompleted: false,
      completedTrainingModules: [],
      trainingModulesCompleted: 0
    });
  } catch (error) {
    console.error("Error fetching driver registration progress:", error);
    res.status(500).json({ message: "Failed to fetch registration progress" });
  }
});

// Save driver registration progress
router.post("/registration-progress", isAuthenticated, hasRole('driver'), async (req, res) => {
  try {
    const driverId = req.user!.id;
    const progressData = req.body;
    
    console.log("Saving registration progress for driver:", driverId, "with data:", progressData);
    
    // Save the progress data
    const savedProgress = await storage.saveDriverRegistrationProgress(driverId, progressData);
    
    res.json({
      success: true,
      message: "Registration progress saved successfully",
      progress: savedProgress,
      formData: progressData.formData,
      vehicleData: progressData.vehicleData
    });
  } catch (error) {
    console.error("Error saving driver registration progress:", error);
    res.status(500).json({ message: "Failed to save registration progress" });
  }
});

// Complete training module
router.post("/complete-training-module", isAuthenticated, hasRole('driver'), async (req, res) => {
  try {
    const driverId = req.user!.id;
    const { moduleId } = req.body;
    
    if (!moduleId) {
      return res.status(400).json({ message: "Module ID is required" });
    }
    
    // Get current progress
    const currentProgress = await storage.getDriverRegistrationProgress(driverId);
    
    // Prepare updated progress with completed module
    let completedModules = currentProgress?.completedTrainingModules || [];
    if (!completedModules.includes(moduleId)) {
      completedModules.push(moduleId);
    }
    
    // Update progress
    const updatedProgress = await storage.saveDriverRegistrationProgress(driverId, {
      ...currentProgress,
      completedTrainingModules: completedModules,
      trainingModulesCompleted: completedModules.length,
      step: 2, // Training step
    });
    
    res.json({ 
      success: true, 
      message: "Training module completed",
      progress: updatedProgress
    });
  } catch (error) {
    console.error("Error completing training module:", error);
    res.status(500).json({ message: "Failed to complete training module" });
  }
});

// Upload document
router.post("/upload-document", isAuthenticated, hasRole('driver'), upload.single('document'), async (req, res) => {
  try {
    const driverId = req.user!.id;
    const file = req.file;
    const documentType = req.body.type;
    
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    if (!documentType) {
      return res.status(400).json({ message: "Document type is required" });
    }
    
    // Valid document types
    const validTypes = ["driverLicense", "insurance", "vehicleRegistration", "backgroundCheck", "drugTest", "mvrRecord"];
    if (!validTypes.includes(documentType)) {
      return res.status(400).json({ message: "Invalid document type" });
    }
    
    // Save document to storage
    const savedDocument = await storage.saveDriverDocument(driverId, {
      type: documentType,
      filePath: file.path,
      fileName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    });
    
    // Update registration progress tracking
    const currentProgress = await storage.getDriverRegistrationProgress(driverId);
    const updateData: any = { ...currentProgress };
    
    switch (documentType) {
      case "backgroundCheck":
        updateData.backgroundCheckUploaded = true;
        updateData.backgroundCheckFileName = file.originalname;
        break;
      case "drugTest":
        updateData.drugTestUploaded = true;
        updateData.drugTestFileName = file.originalname;
        break;
      case "mvrRecord":
        updateData.mvrRecordUploaded = true;
        updateData.mvrRecordFileName = file.originalname;
        break;
      case "firstAidCertification":
        updateData.firstAidCertificationUploaded = true;
        updateData.firstAidCertificationFileName = file.originalname;
        break;
      case "cprCertification":
        updateData.cprCertificationUploaded = true;
        updateData.cprCertificationFileName = file.originalname;
        break;
    }
    
    await storage.saveDriverRegistrationProgress(driverId, updateData);
    
    res.json({
      success: true,
      message: "Document uploaded successfully",
      document: savedDocument
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    res.status(500).json({ message: "Failed to upload document" });
  }
});

// Submit background check request
router.post("/submit-background-check", isAuthenticated, hasRole('driver'), async (req, res) => {
  try {
    const driverId = req.user!.id;
    
    // Get current progress
    const currentProgress = await storage.getDriverRegistrationProgress(driverId);
    
    // Update progress with background check submission
    const updatedProgress = await storage.saveDriverRegistrationProgress(driverId, {
      ...currentProgress,
      backgroundCheckSubmitted: true,
      backgroundCheckSubmittedAt: new Date(),
      step: 1, // Verification step
    });
    
    // In a real system, we would initiate the background check process here
    // by calling a third-party API or creating a task for admin review
    
    res.json({
      success: true,
      message: "Background check submitted successfully",
      progress: updatedProgress
    });
  } catch (error) {
    console.error("Error submitting background check:", error);
    res.status(500).json({ message: "Failed to submit background check" });
  }
});

// Get pricing settings for earnings calculator
router.get("/pricing-settings", isAuthenticated, hasRole('driver'), async (req, res) => {
  try {
    const pricingSettings = await storage.getPricingSettings();
    res.json(pricingSettings);
  } catch (error) {
    console.error("Error fetching pricing settings:", error);
    res.status(500).json({ message: "Failed to fetch pricing settings" });
  }
});

// Get driver status (verification status, background check status, etc.)
router.get("/status", isAuthenticated, hasRole('driver'), async (req, res) => {
  try {
    const driverId = req.user!.id;
    
    // Get driver details with verification status
    const driverDetails = await storage.getDriverDetails(driverId);
    
    // Get registration progress
    const registrationProgress = await storage.getDriverRegistrationProgress(driverId);
    
    res.json({
      isVerified: driverDetails?.verified || false,
      application: {
        status: driverDetails?.accountStatus || "pending",
        backgroundCheckStatus: driverDetails?.backgroundCheckStatus || "pending",
        approvedAt: driverDetails?.verified ? new Date() : null,
        rejectionReason: driverDetails?.backgroundCheckRejectionReason || null,
      },
      registrationProgress: registrationProgress
    });
  } catch (error) {
    console.error("Error fetching driver status:", error);
    res.status(500).json({ message: "Failed to fetch driver status" });
  }
});

export default router;
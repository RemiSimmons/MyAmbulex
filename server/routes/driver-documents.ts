import { Router } from "express";
import { storage } from "../storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { Request, Response } from "express";
import { isAuthenticated } from "../middleware/auth";
import { documentStorageService } from "../services/document-storage-service";

const router = Router();

// Configure multer for MEMORY storage (files go to Supabase, not local disk)
// This ensures all documents are stored in Supabase Storage for production
const upload = multer({
  storage: multer.memoryStorage(), // Store in memory, then upload to Supabase
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images and PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
    }
  },
});

// Get driver documents
router.get('/', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    
    // Get driver details including all document URLs
    // Using standard method for consistency across all document routes
    const driverDetails = await storage.getDriverDetails(userId);
    
    if (!driverDetails) {
      return res.status(404).json({ message: 'Driver details not found' });
    }
    
    // Return document information with verification status
    const documents = {
      licensePhotoFront: driverDetails.licensePhotoFront,
      licensePhotoBack: driverDetails.licensePhotoBack,
      insuranceDocumentUrl: driverDetails.insuranceDocumentUrl,
      vehicleRegistrationUrl: driverDetails.vehicleRegistrationUrl,
      mvrRecordUrl: driverDetails.mvrRecordUrl,
      backgroundCheckDocumentUrl: driverDetails.backgroundCheckDocumentUrl,
      drugTestResultsUrl: driverDetails.drugTestDocumentUrl,
      medicalCertificationUrl: driverDetails.medicalCertificationUrl,
      
      // Verification status - using camelCase field names from schema
      licenseVerified: driverDetails.licenseVerified,
      insuranceVerified: driverDetails.insuranceVerified,
      vehicleVerified: driverDetails.vehicleVerified,
      profileVerified: driverDetails.profileVerified,
      medicalCertificationVerified: driverDetails.medicalCertificationVerified,
    };
    
    res.json(documents);
  } catch (error) {
    console.error('Error fetching driver documents:', error);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
});

// Upload document - NOW USES SUPABASE STORAGE
router.post('/upload', isAuthenticated, upload.single('document'), async (req: any, res) => {
  try {
    const userId = req.user.id;
    const documentType = req.body.documentType;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    if (!documentType) {
      return res.status(400).json({ message: 'Document type is required' });
    }

    console.log(`📤 Uploading driver document to Supabase Storage: ${documentType} for user ${userId}`);
    
    // Upload to Supabase Storage using the unified document storage service
    const { document, filePath } = await documentStorageService.saveDocument(
      file,
      userId,
      documentType
    );

    // The filePath from Supabase will be used as the document reference
    const fileName = filePath;
    
    console.log(`✅ Document uploaded to Supabase: ${fileName}`);
    
    // Update database based on document type
    const updateData: any = {};
    
    switch (documentType) {
      case 'licensePhotoFront':
        updateData.licensePhotoFront = fileName;
        updateData.licenseVerified = null; // Set to pending (null = under review)
        updateData.licenseRejectionReason = null; // Clear rejection reason
        break;
      case 'licensePhotoBack':
        updateData.licensePhotoBack = fileName;
        updateData.licenseVerified = null; // Set to pending (null = under review)
        updateData.licenseRejectionReason = null; // Clear rejection reason
        break;
      case 'insuranceDocument':
        updateData.insuranceDocumentUrl = fileName;
        updateData.insuranceVerified = null; // Set to pending (null = under review)
        updateData.insuranceRejectionReason = null; // Clear rejection reason
        break;
      case 'vehicleRegistration':
        updateData.vehicleRegistrationUrl = fileName;
        updateData.vehicleVerified = null; // Set to pending (null = under review)
        updateData.vehicleRejectionReason = null; // Clear rejection reason
        break;
      case 'mvrRecord':
        updateData.mvrRecordUrl = fileName;
        updateData.mvrRecordVerified = null; // Set to pending (null = under review)
        updateData.mvrRecordRejectionReason = null; // Clear rejection reason
        break;
      case 'backgroundCheck':
        updateData.backgroundCheckDocumentUrl = fileName;
        updateData.backgroundCheckVerified = null; // Set to pending (null = under review)
        updateData.backgroundCheckRejectionReason = null; // Clear rejection reason
        break;
      case 'drugTestResults':
        updateData.drugTestDocumentUrl = fileName;
        updateData.drugTestVerified = null; // Set to pending (null = under review)
        updateData.drugTestRejectionReason = null; // Clear rejection reason
        break;
      case 'certifications':
        updateData.medicalCertificationUrl = fileName;
        updateData.medicalCertificationVerified = null; // Set to pending (null = under review)
        updateData.medicalCertificationRejectionReason = null; // Clear rejection reason
        break;
      default:
        return res.status(400).json({ message: 'Invalid document type' });
    }
    
    // Update driver details
    await storage.updateDriverDetails(userId, updateData);
    
    res.json({
      message: 'Document uploaded successfully',
      fileName,
      documentType,
      documentId: document?.id,
      uploadDate: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ message: 'Failed to upload document' });
  }
});

// View document - handles both old filesystem paths and new API document URLs
router.get('/view/:filename(*)', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const filename = req.params.filename;
    
    if (!filename) {
      return res.status(400).json({ message: 'Filename is required' });
    }
    
    console.log('🔍 DRIVER VIEW: Viewing document for user:', userId, 'Filename:', filename);
    
    // Security: Verify the user owns this document
    // Using standard method for consistency
    const driverDetails = await storage.getDriverDetails(userId);
    
    if (!driverDetails) {
      return res.status(404).json({ message: 'Driver details not found' });
    }
    
    // Check if the filename is actually a document ID from API URLs like /api/documents/164/file
    const documentIdMatch = filename.match(/^(\d+)\/file$/);
    if (documentIdMatch) {
      const documentId = parseInt(documentIdMatch[1]);
      console.log('🔍 DRIVER VIEW: Detected API document ID:', documentId);
      
      // Get the document record from database
      const documentRecord = await storage.getDocumentById(documentId);
      console.log('🔍 DRIVER VIEW: Document record found:', !!documentRecord);
      
      if (!documentRecord) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      // Verify this document belongs to the current user
      if (documentRecord.userId !== userId) {
        console.log('🔍 DRIVER VIEW: Access denied - document belongs to user', documentRecord.userId, 'but requesting user is', userId);
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Use the document storage service to get the file
      const { documentStorageService } = await import('../services/document-storage-service');
      const documentFile = await documentStorageService.getDocumentFile(documentRecord.filePath);
      
      if (!documentFile) {
        console.log('🔍 DRIVER VIEW: Document file not found at path:', documentRecord.filePath);
        return res.status(404).json({ message: 'Document file not found' });
      }
      
      // Set appropriate headers
      res.setHeader('Content-Type', documentFile.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${path.basename(documentRecord.filePath)}"`);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      
      console.log('✅ DRIVER VIEW: Serving API document file with Content-Type:', documentFile.mimeType);
      
      // Send the file
      return res.send(documentFile.buffer);
    }
    
    // Fallback: Handle old filesystem-based document access
    console.log('🔍 DRIVER VIEW: Attempting filesystem-based document access');
    
    // Check if the file belongs to this driver
    const documentFields = [
      'licensePhotoFront',
      'licensePhotoBack', 
      'insuranceDocumentUrl',
      'vehicleRegistrationUrl',
      'mvrRecordUrl',
      'backgroundCheckDocumentUrl',
      'drugTestDocumentUrl',
      'medicalCertificationUrl'
    ];
    
    const ownsDocument = documentFields.some(field => {
      const fieldValue = (driverDetails as any)[field];
      return fieldValue === filename || fieldValue === `/${filename}` || fieldValue?.includes(filename);
    });
    
    if (!ownsDocument) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Find the file in local filesystem
    const possiblePaths = [
      path.join(process.cwd(), 'uploads', `driver_${userId}`, filename),
      path.join(process.cwd(), 'uploads', filename),
      path.join(process.cwd(), 'uploads', 'documents', filename),
      path.join(process.cwd(), 'uploads', 'documents', `user_${userId}`, filename)
    ];
    
    let localFilePath = possiblePaths.find(p => fs.existsSync(p));
    
    if (!localFilePath) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Serve the file from local filesystem
    const stat = fs.statSync(localFilePath);
    const fileSize = stat.size;
    
    // Get file extension to determine content type
    const ext = path.extname(localFilePath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    
    // Stream the file
    const readStream = fs.createReadStream(localFilePath);
    readStream.on('error', (err) => {
      console.error('File stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error streaming file' });
      }
    });
    
    readStream.pipe(res);
    
  } catch (error) {
    console.error('Error viewing document:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to view document' });
    }
  }
});

// Delete document
router.delete('/delete/:documentType', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const documentType = req.params.documentType;
    
    // Get current document filename
    // Using standard method for consistency
    const driverDetails = await storage.getDriverDetails(userId);
    
    if (!driverDetails) {
      return res.status(404).json({ message: 'Driver details not found' });
    }
    
    let currentFileName = null;
    const updateData: any = {};
    
    switch (documentType) {
      case 'licensePhotoFront':
        currentFileName = driverDetails.licensePhotoFront;
        updateData.licensePhotoFront = null;
        break;
      case 'licensePhotoBack':
        currentFileName = driverDetails.licensePhotoBack;
        updateData.licensePhotoBack = null;
        break;
      case 'insuranceDocument':
        currentFileName = driverDetails.insuranceDocumentUrl;
        updateData.insuranceDocumentUrl = null;
        break;
      case 'vehicleRegistration':
        currentFileName = driverDetails.vehicleRegistrationUrl;
        updateData.vehicleRegistrationUrl = null;
        break;
      case 'mvrRecord':
        currentFileName = driverDetails.mvrRecordUrl;
        updateData.mvrRecordUrl = null;
        break;
      case 'backgroundCheck':
        currentFileName = driverDetails.backgroundCheckDocumentUrl;
        updateData.backgroundCheckDocumentUrl = null;
        break;
      case 'drugTestResults':
        currentFileName = driverDetails.drugTestDocumentUrl;
        updateData.drugTestDocumentUrl = null;
        break;
      case 'certifications':
        currentFileName = driverDetails.medicalCertificationUrl;
        updateData.medicalCertificationUrl = null;
        break;
      default:
        return res.status(400).json({ message: 'Invalid document type' });
    }
    
    // Delete file from local filesystem
    if (currentFileName) {
      const possiblePaths = [
        path.join(process.cwd(), 'uploads', `driver_${userId}`, currentFileName),
        path.join(process.cwd(), 'uploads', currentFileName),
        path.join(process.cwd(), 'uploads', 'documents', currentFileName),
        path.join(process.cwd(), 'uploads', 'documents', `user_${userId}`, currentFileName)
      ];
      
      for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('Deleted file:', filePath);
          break;
        }
      }
    }
    
    // Update database
    await storage.updateDriverDetails(userId, updateData);
    
    res.json({ message: 'Document deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Failed to delete document' });
  }
});

export default router;
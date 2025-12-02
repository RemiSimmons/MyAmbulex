import { Router } from 'express';
import type { Request, Response } from 'express';
import { isAuthenticated } from '../../middleware/auth';
import { documentStorageService } from '../../services/document-storage-service';
import { storage } from '../../storage';
import { UserErrorTranslator } from '../../services/user-friendly-errors';
import { validateFile, isFileTypeAllowed, getDocumentDatabaseField } from '@shared/document-validation';
import multer from 'multer';
import path from 'path';

const router = Router();

// Configure multer for memory storage with unified validation
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit (will be validated properly after upload)
  },
  fileFilter: (req, file, cb) => {
    // Extract document type from request body
    const documentType = req.body?.documentType;
    
    console.log('🔍 File filter check:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname,
      documentType
    });
    
    // Basic file type check using unified validation
    if (documentType && isFileTypeAllowed(file.mimetype, documentType)) {
      console.log('✅ File type accepted:', file.mimetype);
      cb(null, true);
    } else {
      // Allow all files through filter, detailed validation happens after upload
      // This prevents file.size being undefined during filter phase
      console.log('⚠️ File type check deferred to post-upload validation');
      cb(null, true);
    }
  }
});

// Upload document endpoint
router.post('/api/documents/upload', isAuthenticated, upload.single('document'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      const error = UserErrorTranslator.translate('upload_failed', req.user?.role);
      return res.status(400).json(UserErrorTranslator.formatForResponse(error));
    }

    const { documentType, registrationStep } = req.body;
    
    if (!documentType) {
      const error = UserErrorTranslator.translate('server_error', req.user?.role);
      return res.status(400).json(UserErrorTranslator.formatForResponse(error));
    }

    console.log('📄 Document upload request:', {
      userId: req.user!.id,
      documentType,
      registrationStep,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Unified validation using shared validation utility
    const validationResult = validateFile(
      {
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype
      },
      documentType
    );

    if (!validationResult.valid) {
      console.log('❌ File validation failed:', validationResult.errors);
      return res.status(400).json({
        success: false,
        message: validationResult.errors[0] || 'File validation failed',
        errors: validationResult.errors,
        code: 'VALIDATION_ERROR'
      });
    }

    // Log warnings if any
    if (validationResult.warnings && validationResult.warnings.length > 0) {
      console.log('⚠️ File validation warnings:', validationResult.warnings);
    }

    // Save document using unified storage service
    const { document, filePath } = await documentStorageService.saveDocument(
      req.file, 
      req.user!.id, 
      documentType
    );

    // Update driver details with document URL using unified mapping
    if (req.user!.role === 'driver') {
      const databaseField = getDocumentDatabaseField(documentType);
      // Store the full access URL, not just filename
      const documentUrl = `/api/documents/${document.id}/file`;
      const updateData: any = {
        [databaseField]: documentUrl
      };

      // Create proper field name mappings for verification status and rejection reasons
      const fieldMappings: Record<string, { verified: string; rejectionReason: string }> = {
        licensePhotoFront: { verified: 'licenseVerified', rejectionReason: 'licenseRejectionReason' },
        licensePhotoBack: { verified: 'licenseVerified', rejectionReason: 'licenseRejectionReason' },
        insuranceDocumentUrl: { verified: 'insuranceVerified', rejectionReason: 'insuranceRejectionReason' },
        vehicleRegistrationUrl: { verified: 'vehicleVerified', rejectionReason: 'vehicleRejectionReason' },
        backgroundCheckDocumentUrl: { verified: 'backgroundCheckVerified', rejectionReason: 'backgroundCheckRejectionReason' },
        drugTestDocumentUrl: { verified: 'drugTestVerified', rejectionReason: 'drugTestRejectionReason' },
        mvrRecordUrl: { verified: 'mvrRecordVerified', rejectionReason: 'mvrRecordRejectionReason' },
        medicalCertificationUrl: { verified: 'medicalCertificationVerified', rejectionReason: 'medicalCertificationRejectionReason' },
        cprFirstAidCertificationUrl: { verified: 'cprFirstAidCertificationVerified', rejectionReason: 'cprFirstAidCertificationRejectionReason' },
        basicLifeSupportUrl: { verified: 'basicLifeSupportVerified', rejectionReason: 'basicLifeSupportRejectionReason' },
        advancedLifeSupportUrl: { verified: 'advancedLifeSupportVerified', rejectionReason: 'advancedLifeSupportRejectionReason' },
        emtCertificationUrl: { verified: 'emtCertificationVerified', rejectionReason: 'emtCertificationRejectionReason' },
        paramedicCertificationUrl: { verified: 'paramedicCertificationVerified', rejectionReason: 'paramedicCertificationRejectionReason' },
        profilePhoto: { verified: 'profileVerified', rejectionReason: 'profileRejectionReason' }
      };

      const mapping = fieldMappings[databaseField];
      if (mapping) {
        updateData[mapping.verified] = null; // Set to pending (null = under review)
        updateData[mapping.rejectionReason] = null; // Clear rejection reason
      }

      console.log('💾 Updating driver details:', {
        documentType,
        databaseField,
        documentUrl,
        verifiedField: mapping?.verified,
        rejectionReasonField: mapping?.rejectionReason,
        updateData,
        documentId: document.id
      });

      // Check if driver details exist, create if they don't
      // Using standard method for consistency across all document upload routes
      let driverDetails = await storage.getDriverDetails(req.user!.id);
      if (!driverDetails) {
        console.log('🆕 Creating driver details record for user:', req.user!.id);
        try {
          // Create minimal driver details record
          driverDetails = await storage.createDriverDetails({
            userId: req.user!.id,
            licenseNumber: '',
            licenseState: '',
            licenseExpiry: new Date(),
            insuranceProvider: '',
            insuranceNumber: '',
            insuranceExpiry: new Date(),
            vehicleYear: 2020,
            vehicleMake: '',
            vehicleModel: '',
            vehicleColor: '',
            vehicleLicensePlate: '',
            maxTravelDistance: 50,
            yearsOfExperience: 0,
            backgroundCheckStatus: 'pending',
            accountStatus: 'pending',
            serviceArea: [],
            serviceHours: {}
          });
          console.log('✅ Driver details record created successfully:', driverDetails);
        } catch (createError) {
          console.error('❌ Failed to create driver details record:', createError);
          throw createError;
        }
      }

      try {
        await storage.updateDriverDetails(req.user!.id, updateData);
        console.log('✅ Driver details updated successfully with document URL');
      } catch (updateError) {
        console.error('❌ Failed to update driver details:', updateError);
        throw updateError;
      }

      // Update registration progress flags for upload tracking
      try {
        const currentProgress = await storage.getDriverRegistrationProgress(req.user!.id);
        const progressData = currentProgress?.formData || {};
        
        // Map document types to registration progress flags
        const progressFlagMapping: Record<string, string> = {
          licensePhotoFront: 'licenseUploaded',
          licensePhotoBack: 'licenseUploaded', // Both license photos set the same flag
          insuranceDocumentUrl: 'insuranceUploaded',
          vehicleRegistrationUrl: 'vehicleRegistrationUploaded',
          backgroundCheckDocumentUrl: 'backgroundCheckSubmitted'
        };
        
        const progressFlag = progressFlagMapping[databaseField];
        if (progressFlag) {
          console.log('📊 Updating registration progress flag:', progressFlag);
          progressData[progressFlag] = true;
          
          await storage.saveDriverRegistrationProgress(req.user!.id, {
            step: currentProgress?.step || 0,
            formData: progressData,
            vehicleData: currentProgress?.vehicleData || {},
            availabilitySettings: currentProgress?.availabilitySettings || {}
          });
          
          console.log('✅ Registration progress updated successfully');
        }
      } catch (progressError) {
        console.error('⚠️ Failed to update registration progress, but document upload succeeded:', progressError);
        // Don't fail the entire upload if progress update fails
      }
    }

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      document: {
        id: document.id,
        type: documentType,
        filename: document.filename,
        originalName: document.originalName,
        url: `/api/documents/${document.id}/file`,
        verificationStatus: document.verificationStatus
      }
    });
  } catch (error) {
    console.error('💥 Error uploading document:', error);
    
    // Provide more specific error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      success: false,
      message: 'Upload failed due to server error',
      details: errorMessage,
      code: 'SERVER_ERROR'
    });
  }
});

// Get driver documents
router.get('/api/driver/documents', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'driver') {
      return res.status(403).json({ error: 'Access denied. Driver role required.' });
    }

    // Using standard method for consistency across all document routes
    const driverDetails = await storage.getDriverDetails(req.user!.id);
    
    // If driver details don't exist yet (e.g., during onboarding), return empty document structure
    const documents = {
      licensePhotoFront: driverDetails?.licensePhotoFront || null,
      licensePhotoBack: driverDetails?.licensePhotoBack || null,
      insuranceDocumentUrl: driverDetails?.insuranceDocumentUrl || null,
      vehicleRegistrationUrl: driverDetails?.vehicleRegistrationUrl || null,
      medicalCertificationUrl: driverDetails?.medicalCertificationUrl || null,
      backgroundCheckDocumentUrl: driverDetails?.backgroundCheckDocumentUrl || null,
      drugTestDocumentUrl: driverDetails?.drugTestDocumentUrl || null,
      mvrRecordUrl: driverDetails?.mvrRecordUrl || null,
      profilePhoto: driverDetails?.profilePhoto || null,
      cprFirstAidCertificationUrl: driverDetails?.cprFirstAidCertificationUrl || null,
      // New medical certification fields
      basicLifeSupportUrl: driverDetails?.basicLifeSupportUrl || null,
      advancedLifeSupportUrl: driverDetails?.advancedLifeSupportUrl || null,
      emtCertificationUrl: driverDetails?.emtCertificationUrl || null,
      paramedicCertificationUrl: driverDetails?.paramedicCertificationUrl || null,
      // Verification status - preserve null values (null = pending, true = approved, false = rejected)
      licenseVerified: driverDetails?.licenseVerified ?? null,
      insuranceVerified: driverDetails?.insuranceVerified ?? null,
      vehicleVerified: driverDetails?.vehicleVerified ?? null,
      medicalCertificationVerified: driverDetails?.medicalCertificationVerified ?? null,
      backgroundCheckVerified: driverDetails?.backgroundCheckVerified ?? null,
      drugTestVerified: driverDetails?.drugTestVerified ?? null,
      mvrRecordVerified: driverDetails?.mvrRecordVerified ?? null,
      profileVerified: driverDetails?.profileVerified ?? null,
      // Combined CPR/First Aid verification status
      cprFirstAidCertificationVerified: driverDetails?.cprFirstAidCertificationVerified ?? null,
      // New medical certification verification statuses
      basicLifeSupportVerified: driverDetails?.basicLifeSupportVerified ?? null,
      advancedLifeSupportVerified: driverDetails?.advancedLifeSupportVerified ?? null,
      emtCertificationVerified: driverDetails?.emtCertificationVerified ?? null,
      paramedicCertificationVerified: driverDetails?.paramedicCertificationVerified ?? null
    };

    res.json(documents);
  } catch (error) {
    console.error('Error fetching driver documents:', error);
    res.status(500).json({ error: 'Failed to fetch driver documents' });
  }
});

// Serve document files
router.get('/api/documents/:documentId/file', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const filePath = await documentStorageService.getDocumentPath(documentId);
    
    if (!filePath) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Security: Only allow users to access their own documents or admins
    const document = await documentStorageService.getUserDocuments(req.user!.id);
    const hasAccess = document.some(doc => doc.id === documentId) || req.user!.role === 'admin';
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.sendFile(filePath, { root: '.' });
  } catch (error) {
    console.error('Error serving document file:', error);
    res.status(500).json({ error: 'Failed to serve document' });
  }
});

// Get document status
router.get('/api/driver/document-status', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'driver') {
      return res.status(403).json({ error: 'Access denied. Driver role required.' });
    }

    // Using standard method for consistency
    const driverDetails = await storage.getDriverDetails(req.user!.id);
    if (!driverDetails) {
      return res.status(404).json({ error: 'Driver details not found' });
    }

    const documentStatus = {
      licensePhotoFront: {
        uploaded: !!driverDetails.licensePhotoFront,
        verified: driverDetails.licenseVerified || false,
        url: driverDetails.licensePhotoFront || null
      },
      licensePhotoBack: {
        uploaded: !!driverDetails.licensePhotoBack,
        verified: driverDetails.licenseVerified || false,
        url: driverDetails.licensePhotoBack || null
      },
      insurance: {
        uploaded: !!driverDetails.insuranceDocumentUrl,
        verified: driverDetails.insuranceVerified || false,
        url: driverDetails.insuranceDocumentUrl || null
      },
      vehicleRegistration: {
        uploaded: !!driverDetails.vehicleRegistrationUrl,
        verified: driverDetails.vehicleVerified || false,
        url: driverDetails.vehicleRegistrationUrl || null
      },
      medicalCertification: {
        uploaded: !!driverDetails.medicalCertificationUrl,
        verified: driverDetails.medicalCertificationVerified || false,
        url: driverDetails.medicalCertificationUrl || null
      },
      backgroundCheck: {
        uploaded: !!driverDetails.backgroundCheckDocumentUrl,
        verified: driverDetails.backgroundCheckVerified || false,
        url: driverDetails.backgroundCheckDocumentUrl || null
      },
      drugTest: {
        uploaded: !!driverDetails.drugTestDocumentUrl,
        verified: driverDetails.drugTestVerified || false,
        url: driverDetails.drugTestDocumentUrl || null
      },
      mvrRecord: {
        uploaded: !!driverDetails.mvrRecordUrl,
        verified: driverDetails.mvrRecordVerified || false,
        url: driverDetails.mvrRecordUrl || null
      },
      profilePhoto: {
        uploaded: !!driverDetails.profilePhoto,
        verified: driverDetails.profileVerified || false,
        url: driverDetails.profilePhoto || null
      },
      cprFirstAidCertification: {
        uploaded: !!driverDetails.cprFirstAidCertificationUrl,
        verified: driverDetails.cprFirstAidCertificationVerified || false,
        url: driverDetails.cprFirstAidCertificationUrl || null
      }
    };

    res.json(documentStatus);
  } catch (error) {
    console.error('Error fetching document status:', error);
    res.status(500).json({ error: 'Failed to fetch document status' });
  }
});

export default router;
import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated, hasRole } from "../middleware/auth";
import path from "path";
import { notificationService } from "../notifications";
import { documentStorageService } from "../services/document-storage-service";
import fs from 'fs';
import { promisify } from 'util';

const router = Router();
const access = promisify(fs.access);

// Helper function to check if document has rejection reason
function getRejectionReason(field: string, driverDetails: any): boolean {
  const rejectionFieldMap: { [key: string]: string } = {
    'licensePhotoFront': 'licenseRejectionReason',
    'licensePhotoBack': 'licenseRejectionReason', 
    'insuranceDocumentUrl': 'insuranceRejectionReason',
    'vehicleRegistrationUrl': 'vehicleRejectionReason',
    'medicalCertificationUrl': 'medicalCertificationRejectionReason',
    'backgroundCheckDocumentUrl': 'backgroundCheckRejectionReason',
    'drugTestDocumentUrl': 'drugTestRejectionReason',
    'mvrRecordUrl': 'mvrRecordRejectionReason',
    'profilePhoto': 'profileRejectionReason'
  };
  
  const rejectionField = rejectionFieldMap[field];
  return rejectionField && driverDetails[rejectionField] ? true : false;
}

// Import centralized verification utility
import { isAllDocumentsVerified as checkAllDocumentsVerified } from '../utils/driver-verification';

// Helper function to check if all required documents are verified
function isAllDocumentsVerified(driverDetails: any): boolean {
  return checkAllDocumentsVerified(driverDetails);
}

// Get all documents for a specific driver
router.get("/documents/:driverId", isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    const driverId = parseInt(req.params.driverId);
    console.log(`🔍 ADMIN DOCUMENTS DEBUG: Driver ID ${driverId}, User: ${req.user?.username}, Role: ${req.user?.role}`);
    console.log(`🔍 ADMIN DOCUMENTS SESSION: ${JSON.stringify({ 
      isAuthenticated: req.isAuthenticated(), 
      hasUser: !!req.user,
      sessionID: req.sessionID,
      userId: req.user?.id 
    })}`);
    console.log(`🔍 ADMIN DOCUMENTS ROUTE HIT: /api/admin/documents/${driverId}`);
    
    // The admin panel passes user ID, so we need to get driver details by user ID
    console.log(`📋 ADMIN DOCUMENTS: Starting data retrieval for driverId=${driverId}`);
    console.log(`📋 ADMIN DOCUMENTS: Request params - driverId type: ${typeof driverId}, value: ${driverId}`);
    
    console.log(`📋 ADMIN DOCUMENTS: Calling storage.getDriverDetails(${driverId}) - assuming driverId is actually userId`);
    let driverDetails = await storage.getDriverDetails(driverId);
    console.log(`📋 ADMIN DOCUMENTS: getDriverDetails RESULT: ${!!driverDetails}`);
    
    if (driverDetails) {
      console.log(`📋 ADMIN DOCUMENTS: Driver details found - id: ${driverDetails.id}, userId: ${driverDetails.userId}`);
      console.log(`📋 ADMIN DOCUMENTS: Full driver details object keys:`, Object.keys(driverDetails));
    } else {
      console.log(`📋 ADMIN DOCUMENTS: No driver details found for driverId=${driverId}`);
      console.log(`📋 ADMIN DOCUMENTS: Checking if user exists in users table...`);
      const user = await storage.getUser(driverId);
      console.log(`📋 ADMIN DOCUMENTS: User lookup result: ${!!user}, role: ${user?.role}`);
    }
    
    let userId = driverId;

    console.log(`📋 FETCHING DRIVER DETAILS for ID: ${driverId}, Found: ${!!driverDetails}`);
    
    if (driverDetails) {
      console.log(`📋 DRIVER DETAILS OBJECT:`, {
        id: driverDetails.id,
        userId: driverDetails.userId,
        licensePhotoFront: driverDetails.licensePhotoFront,
        licensePhotoBack: driverDetails.licensePhotoBack,
        insuranceDocumentUrl: driverDetails.insuranceDocumentUrl,
        profilePhoto: driverDetails.profilePhoto,
        vehicleRegistrationUrl: driverDetails.vehicleRegistrationUrl,
        medicalCertificationUrl: driverDetails.medicalCertificationUrl,
        backgroundCheckDocumentUrl: driverDetails.backgroundCheckDocumentUrl,
        objectKeys: Object.keys(driverDetails)
      });
      
      // SNAKE_CASE CHECK: Test for snake_case field names
      console.log(`📋 CAMEL_CASE FIELDS:`, {
        licensePhotoFront: (driverDetails as any).licensePhotoFront,
        licensePhotoBack: (driverDetails as any).licensePhotoBack,
        insuranceDocumentUrl: (driverDetails as any).insuranceDocumentUrl,
        profilePhoto: (driverDetails as any).profilePhoto,
        vehicleRegistrationUrl: (driverDetails as any).vehicleRegistrationUrl,
        medicalCertificationUrl: (driverDetails as any).medicalCertificationUrl,
        backgroundCheckDocumentUrl: (driverDetails as any).backgroundCheckDocumentUrl,
        drugTestDocumentUrl: (driverDetails as any).drugTestDocumentUrl,
        mvrRecordUrl: (driverDetails as any).mvrRecordUrl
      });
    }
    
    if (!driverDetails) {
      console.log(`❌ Driver not found for ID: ${driverId}`);
      return res.status(404).json({ message: "Driver not found" });
    }
    
    if (!driverDetails) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // Collect all document URLs and check if files exist
    const documents = [];
    const documentFields = [
      { field: 'licensePhotoFront', dbField: 'license_photo_front', type: 'Driver License (Front)', required: true },
      { field: 'licensePhotoBack', dbField: 'license_photo_back', type: 'Driver License (Back)', required: true },
      { field: 'insuranceDocumentUrl', dbField: 'insurance_document_url', type: 'Insurance Document', required: true },
      { field: 'profilePhoto', dbField: 'profile_photo', type: 'Profile Photo', required: true },
      { field: 'vehicleRegistrationUrl', dbField: 'vehicle_registration_url', type: 'Vehicle Registration', required: true },
      { field: 'mvrRecordUrl', dbField: 'mvr_record_url', type: 'MVR Record', required: true },
      { field: 'medicalCertificationUrl', dbField: 'medical_certification_url', type: 'Medical Certification', required: false },
      { field: 'cprFirstAidCertificationUrl', dbField: 'cpr_first_aid_certification_url', type: 'CPR/First Aid Certification', required: true },
      { field: 'basicLifeSupportUrl', dbField: 'basic_life_support_url', type: 'Basic Life Support (BLS)', required: true },
      { field: 'advancedLifeSupportUrl', dbField: 'advanced_life_support_url', type: 'Advanced Life Support (ALS)', required: false },
      { field: 'emtCertificationUrl', dbField: 'emt_certification_url', type: 'EMT Certification', required: false },
      { field: 'paramedicCertificationUrl', dbField: 'paramedic_certification_url', type: 'Paramedic Certification', required: false },
      { field: 'backgroundCheckDocumentUrl', dbField: 'background_check_document_url', type: 'Background Check', required: true },
      { field: 'drugTestDocumentUrl', dbField: 'drug_test_results_url', type: 'Drug Test Results', required: true }
    ];

    for (const docField of documentFields) {
      // Use the camelCase field name directly since Drizzle converts snake_case to camelCase
      const documentUrl = (driverDetails as any)[docField.field];
      let fileExists = false;
      let filePath = null;

      console.log(`🔍 Document Debug - Field: ${docField.field}, DB Field: ${docField.dbField}, URL: ${documentUrl}`);

      if (documentUrl && documentUrl.trim() !== '' && documentUrl !== '/uploads/documents/') {
        // For local storage, document URLs are in format /api/documents/{id}/file
        // Extract the document ID and check if the actual file exists
        const documentIdMatch = documentUrl.match(/\/api\/documents\/(\d+)\/file/);
        if (documentIdMatch) {
          const documentId = parseInt(documentIdMatch[1]);
          const documentRecord = await storage.getDocumentById(documentId);
          if (documentRecord && documentRecord.filePath) {
            try {
              // First try the exact path from database
              await access(documentRecord.filePath);
              fileExists = true;
              filePath = documentRecord.filePath;
              console.log(`📁 ${docField.field}: Local Path="${documentRecord.filePath}", Exists=${fileExists}`);
            } catch {
              // If the exact path doesn't exist, try to find the file using the document storage service
              // which should handle the file location logic properly
              console.log(`📁 ${docField.field}: Trying documentStorageService.getDocumentFile as fallback`);
              try {
                const documentFile = await documentStorageService.getDocumentFile(documentRecord.filePath);
                if (documentFile && documentFile.buffer) {
                  fileExists = true;
                  filePath = documentRecord.filePath; // Keep the DB path for reference
                  console.log(`📁 ${docField.field}: Found file via documentStorageService`);
                } else {
                  fileExists = false;
                  console.log(`📁 ${docField.field}: File not found via documentStorageService`);
                }
              } catch (serviceError: any) {
                fileExists = false;
                console.log(`📁 ${docField.field}: documentStorageService failed: ${serviceError?.message || 'Unknown error'}`);
              }
            }
          } else {
            console.log(`📁 ${docField.field}: Document record not found for ID ${documentId}`);
          }
        } else {
          console.log(`📁 ${docField.field}: Invalid document URL format: ${documentUrl}`);
        }
      } else {
        console.log(`📁 No valid document URL for ${docField.field}`);
      }

      // Get verification status from the corresponding verification field (camelCase)
      let verificationField = '';
      switch (docField.field) {
        case 'licensePhotoFront':
        case 'licensePhotoBack':
          verificationField = 'licenseVerified';
          break;
        case 'insuranceDocumentUrl':
          verificationField = 'insuranceVerified';
          break;
        case 'profilePhoto':
          verificationField = 'profileVerified';
          break;
        case 'vehicleRegistrationUrl':
          verificationField = 'vehicleVerified';
          break;
        case 'medicalCertificationUrl':
          verificationField = 'medicalCertificationVerified';
          break;
        case 'backgroundCheckDocumentUrl':
          verificationField = 'backgroundCheckVerified';
          break;
        case 'drugTestDocumentUrl':
          verificationField = 'drugTestVerified';
          break;
        case 'mvrRecordUrl':
          verificationField = 'mvrRecordVerified';
          break;
        case 'cprFirstAidCertificationUrl':
          verificationField = 'cprFirstAidCertificationVerified';
          break;
        case 'basicLifeSupportUrl':
          verificationField = 'basicLifeSupportVerified';
          break;
        case 'advancedLifeSupportUrl':
          verificationField = 'advancedLifeSupportVerified';
          break;
        case 'emtCertificationUrl':
          verificationField = 'emtCertificationVerified';
          break;
        case 'paramedicCertificationUrl':
          verificationField = 'paramedicCertificationVerified';
          break;
        default:
          verificationField = `${docField.field.replace('Url', '').replace('Photo', '').replace('Document', '').toLowerCase()}Verified`;
      }
      const isVerified = (driverDetails as any)[verificationField] || false;

      // Determine status based on verification and file existence
      let documentStatus = 'not_uploaded';
      if (documentUrl) {
        if (!fileExists) {
          documentStatus = 'missing';
        } else {
          // Check if admin has explicitly reviewed this document
          const hasRejectionReason = getRejectionReason(docField.field, driverDetails);
          if (isVerified === true) {
            documentStatus = 'approved';
          } else if (isVerified === false && hasRejectionReason) {
            documentStatus = 'rejected';
          } else {
            documentStatus = 'uploaded';
          }
        }
      }

      const documentObj = {
        type: docField.type,
        field: docField.field,
        url: documentUrl,
        uploaded: !!documentUrl,
        fileExists,
        required: docField.required,
        status: documentStatus,
        verified: isVerified
      };
      
      console.log(`📄 Document Object for ${docField.field}:`, {
        hasUrl: !!documentUrl,
        urlValue: documentUrl,
        fileExistsVar: fileExists,
        statusCalc: documentUrl ? (fileExists ? 'uploaded' : 'missing') : 'not_uploaded',
        finalObject: documentObj
      });
      
      documents.push(documentObj);
    }

    // Add certifications if any
    if (driverDetails.certifications && Array.isArray(driverDetails.certifications)) {
      for (let index = 0; index < driverDetails.certifications.length; index++) {
        const cert = driverDetails.certifications[index];
        let fileExists = false;
        
        // Check if certification document exists in local storage
        if (cert.documentUrl) {
          const documentIdMatch = cert.documentUrl.match(/\/api\/documents\/(\d+)\/file/);
          if (documentIdMatch) {
            const documentId = parseInt(documentIdMatch[1]);
            const documentRecord = await storage.getDocumentById(documentId);
            if (documentRecord && documentRecord.filePath) {
              try {
                await access(documentRecord.filePath);
                fileExists = true;
              } catch {
                fileExists = false;
              }
            }
          }
        }
        
        // Determine certification status based on verification
        let certStatus = 'not_uploaded';
        if (cert.documentUrl) {
          if (!fileExists) {
            certStatus = 'missing';
          } else if (cert.verified === true) {
            certStatus = 'approved';
          } else if (cert.verified === false) {
            certStatus = 'rejected';
          } else {
            certStatus = 'uploaded';
          }
        }

        documents.push({
          type: `Certification - ${cert.name}`,
          field: `certification_${index}`,
          url: cert.documentUrl,
          uploaded: true,
          fileExists,
          required: false,
          status: certStatus,
          certificationName: cert.name,
          verified: cert.verified || false
        });
      }
    }

    // Get user information for driver name
    const userInfo = await storage.getUser(driverDetails.userId);
    
    res.json({
      driverId,
      driverName: userInfo?.fullName || 'Unknown Driver',
      documents,
      summary: {
        total: documents.length,
        uploaded: documents.filter(d => d.uploaded).length,
        missing: documents.filter(d => d.status === 'missing').length,
        notUploaded: documents.filter(d => d.status === 'not_uploaded').length
      }
    });

  } catch (error) {
    console.error("Error fetching driver documents:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Serve document files for admin review
router.get("/documents/:driverId/:documentField/view", async (req, res) => {
  try {
    console.log(`🚨 OLD ADMIN DOCUMENT VIEW ROUTE HIT! Driver ${req.params.driverId}, Field ${req.params.documentField}`);
    console.log(`🚨 OLD ADMIN DOCUMENT VIEW: User authenticated: ${req.isAuthenticated()}, Role: ${req.user?.role}`);
    console.log(`🚨 OLD ADMIN DOCUMENT VIEW: This should NOT be used! Frontend should use direct document URLs like /api/documents/164/file`);
    
    // Admin document view request authenticated and authorized
    
    if (!req.isAuthenticated()) {
      console.log(`❌ ADMIN DOCUMENT VIEW: Authentication failed`);
      return res.status(401).json({ message: "Authentication required" });
    }
    
    if (req.user.role !== "admin") {
      console.log(`❌ ADMIN DOCUMENT VIEW: Access denied - role: ${req.user.role}`);
      return res.status(403).json({ message: "Admin access required" });
    }

    const driverId = parseInt(req.params.driverId);
    const documentField = req.params.documentField;
    
    console.log(`🔍 ADMIN DOCUMENT VIEW: Processing driver ${driverId}, field ${documentField}`);
    
    // The driverId parameter is actually the user ID, so use standard method
    const driverDetails = await storage.getDriverDetails(driverId);
    
    console.log(`🔍 ADMIN DOCUMENT VIEW: Driver details found: ${!!driverDetails}`);
    
    if (!driverDetails) {
      console.log(`❌ ADMIN DOCUMENT VIEW: Driver ${driverId} not found`);
      return res.status(404).json({ message: "Driver not found" });
    }

    let documentUrl = null;

    // Handle certification documents
    if (documentField.startsWith('certification_')) {
      const certIndex = parseInt(documentField.replace('certification_', ''));
      if (driverDetails.certifications && Array.isArray(driverDetails.certifications) && driverDetails.certifications[certIndex]) {
        documentUrl = (driverDetails.certifications as any)[certIndex].documentUrl;
      }
    } else {
      // The storage layer converts snake_case database columns to camelCase
      // So we can access the fields directly with camelCase names
      documentUrl = (driverDetails as any)[documentField];
      
      console.log(`🔍 ADMIN DOCUMENT VIEW: Direct field access for ${documentField}: ${documentUrl}`);
      
      // If direct access fails, try some common variations
      if (!documentUrl) {
        const alternativeFields = [
          documentField.toLowerCase(),
          documentField.replace(/([A-Z])/g, '_$1').toLowerCase(),
          documentField.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()
        ];
        
        console.log(`🔍 ADMIN DOCUMENT VIEW: Trying alternative field names: ${alternativeFields.join(', ')}`);
        
        for (const altField of alternativeFields) {
          documentUrl = (driverDetails as any)[altField];
          if (documentUrl) {
            console.log(`🔍 ADMIN DOCUMENT VIEW: Found document URL with field ${altField}: ${documentUrl}`);
            break;
          }
        }
      }
    }

    console.log(`🔍 ADMIN DOCUMENT VIEW: Final document URL: ${documentUrl}`);

    if (!documentUrl) {
      console.log(`❌ ADMIN DOCUMENT VIEW: Document not found for field ${documentField}`);
      console.log(`🔍 ADMIN DOCUMENT VIEW: Available driver fields:`, Object.keys(driverDetails));
      return res.status(404).json({ message: "Document not found" });
    }

    // Serve document from local storage
    const documentIdMatch = documentUrl.match(/\/api\/documents\/(\d+)\/file/);
    if (!documentIdMatch) {
      console.log(`❌ ADMIN DOCUMENT VIEW: Invalid document URL format: ${documentUrl}`);
      return res.status(400).json({ message: "Invalid document URL format" });
    }
    
    const documentId = parseInt(documentIdMatch[1]);
    console.log(`🔍 ADMIN DOCUMENT VIEW: Extracted document ID: ${documentId}`);
    
    const documentRecord = await storage.getDocumentById(documentId);
    console.log(`🔍 ADMIN DOCUMENT VIEW: Document record found: ${!!documentRecord}`);
    console.log(`🔍 ADMIN DOCUMENT VIEW: Document file path: ${documentRecord?.filePath}`);
    
    if (!documentRecord || !documentRecord.filePath) {
      console.log(`❌ ADMIN DOCUMENT VIEW: Document record not found for ID ${documentId}`);
      return res.status(404).json({ message: "Document record not found" });
    }
    
    const documentFile = await documentStorageService.getDocumentFile(documentRecord.filePath);
    console.log(`🔍 ADMIN DOCUMENT VIEW: Document file loaded: ${!!documentFile}`);
    console.log(`🔍 ADMIN DOCUMENT VIEW: File size: ${documentFile?.buffer?.length} bytes, MIME: ${documentFile?.mimeType}`);
    
    if (!documentFile) {
      console.log(`❌ ADMIN DOCUMENT VIEW: Document file not found at path: ${documentRecord.filePath}`);
      return res.status(404).json({ message: "Document file not found" });
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', documentFile.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(documentRecord.filePath)}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    
    console.log(`✅ ADMIN DOCUMENT VIEW: Sending file with Content-Type: ${documentFile.mimeType}`);
    
    // Send the file
    res.send(documentFile.buffer);

  } catch (error) {
    console.error("❌ ADMIN DOCUMENT VIEW ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update document verification status
router.post("/documents/:driverId/:documentField/verify", async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const driverId = parseInt(req.params.driverId);
    const documentField = req.params.documentField;
    const { verified, notes } = req.body;
    
    console.log(`🔍 VERIFY DOCUMENT: Driver ${driverId}, Field ${documentField}, Verified: ${verified}`);
    
    // Get driver details to find the correct user ID
    let driverDetails = await storage.getDriverDetails(driverId);
    let userId = driverId;
    
    // If not found, check if driverId is actually a userId
    if (!driverDetails) {
      const user = await storage.getUser(driverId);
      if (user && user.role === 'driver') {
        const allUsers = await storage.getAllUsers();
        const allDriverDetails = await Promise.all(
          allUsers.filter(u => u.role === 'driver').map(u => storage.getDriverDetails(u.id))
        );
        driverDetails = allDriverDetails.find(dd => dd && dd.userId === driverId);
        userId = driverId;
      }
    }
    
    if (!driverDetails) {
      return res.status(404).json({ message: "Driver not found" });
    }
    
    // Map document field to verification field
    const updateData: any = {};
    switch (documentField) {
      case 'licensePhotoFront':
      case 'licensePhotoBack':
        updateData.licenseVerified = verified;
        if (!verified) updateData.licenseRejectionReason = notes || 'Document rejected';
        break;
      case 'insuranceDocumentUrl':
        updateData.insuranceVerified = verified;
        if (!verified) updateData.insuranceRejectionReason = notes || 'Document rejected';
        break;
      case 'vehicleRegistrationUrl':
        updateData.vehicleVerified = verified;
        if (!verified) updateData.vehicleRejectionReason = notes || 'Document rejected';
        break;
      case 'medicalCertificationUrl':
        updateData.medicalCertificationVerified = verified;
        if (!verified) updateData.medicalCertificationRejectionReason = notes || 'Document rejected';
        break;
      case 'backgroundCheckDocumentUrl':
        updateData.backgroundCheckVerified = verified;
        if (!verified) updateData.backgroundCheckRejectionReason = notes || 'Document rejected';
        break;
      case 'drugTestDocumentUrl':
        updateData.drugTestVerified = verified;
        if (!verified) updateData.drugTestRejectionReason = notes || 'Document rejected';
        break;
      case 'mvrRecordUrl':
        updateData.mvrRecordVerified = verified;
        if (!verified) updateData.mvrRecordRejectionReason = notes || 'Document rejected';
        break;
      case 'profilePhoto':
        updateData.profileVerified = verified;
        if (!verified) updateData.profileRejectionReason = notes || 'Document rejected';
        break;
      case 'cprFirstAidCertificationUrl':
        updateData.cprFirstAidCertificationVerified = verified;
        if (!verified) updateData.cprFirstAidCertificationRejectionReason = notes || 'Document rejected';
        break;
      case 'basicLifeSupportUrl':
        updateData.basicLifeSupportVerified = verified;
        if (!verified) updateData.basicLifeSupportRejectionReason = notes || 'Document rejected';
        break;
      case 'advancedLifeSupportUrl':
        updateData.advancedLifeSupportVerified = verified;
        if (!verified) updateData.advancedLifeSupportRejectionReason = notes || 'Document rejected';
        break;
      case 'emtCertificationUrl':
        updateData.emtCertificationVerified = verified;
        if (!verified) updateData.emtCertificationRejectionReason = notes || 'Document rejected';
        break;
      case 'paramedicCertificationUrl':
        updateData.paramedicCertificationVerified = verified;
        if (!verified) updateData.paramedicCertificationRejectionReason = notes || 'Document rejected';
        break;
      default:
        return res.status(400).json({ message: "Invalid document field" });
    }
    
    console.log(`🔍 UPDATE DATA:`, updateData);
    
    // Update driver details
    await storage.updateDriverDetails(driverDetails.userId, updateData);
    
    // Send notification if document was rejected
    if (!verified && notes) {
      try {
        // Map document field to human-readable name
        const documentNameMap: { [key: string]: string } = {
          'licensePhotoFront': 'Driver License (Front)',
          'licensePhotoBack': 'Driver License (Back)',
          'insuranceDocumentUrl': 'Insurance Document',
          'vehicleRegistrationUrl': 'Vehicle Registration',
          'medicalCertificationUrl': 'Medical Certification',
          'backgroundCheckDocumentUrl': 'Background Check',
          'drugTestResultsUrl': 'Drug Test Results',
          'mvrRecordUrl': 'MVR Record',
          'profilePhoto': 'Profile Photo'
        };
        
        const documentName = documentNameMap[documentField] || documentField;
        
        console.log(`📧 SENDING DOCUMENT REJECTION NOTIFICATION to user ${userId} for ${documentName}`);
        
        // Send document rejection notification
        await notificationService.sendDocumentRejectionNotification(
          userId,
          [documentName],
          [notes],
          true // unlock account
        );
        
        console.log(`✅ Document rejection notification sent successfully`);
      } catch (notificationError) {
        console.error("Error sending document rejection notification:", notificationError);
        // Don't fail the verification update if notification fails
      }
    }
    
    res.json({ 
      success: true, 
      message: `Document ${documentField} verification status updated to ${verified ? 'verified' : 'rejected'}`,
      adminId: req.user.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error updating document verification:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Add the missing endpoints that the frontend expects
// Verify document endpoint
router.post("/drivers/:driverId/verify-document", async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const driverId = parseInt(req.params.driverId);
    const { documentType, rejectionReason } = req.body;
    
    console.log(`🔍 VERIFY DOCUMENT (Frontend Endpoint): Driver ${driverId}, Document Type: ${documentType}`);
    
    // Map frontend documentType to backend documentField
    let documentField = '';
    switch (documentType) {
      case 'license':
        documentField = 'licensePhotoFront'; // Use front as representative
        break;
      case 'insurance':
        documentField = 'insuranceDocumentUrl';
        break;
      case 'vehicle':
        documentField = 'vehicleRegistrationUrl';
        break;
      case 'profile':
        documentField = 'profilePhoto';
        break;
      case 'background':
        documentField = 'backgroundCheckDocumentUrl';
        break;
      case 'drug_test':
        documentField = 'drugTestDocumentUrl';
        break;
      case 'mvr':
        documentField = 'mvrRecordUrl';
        break;
      case 'medical':
        documentField = 'medicalCertificationUrl';
        break;
      case 'first_aid':
      case 'cpr_first_aid':
      case 'cprFirstAid':  // This is what the frontend actually sends
        documentField = 'cprFirstAidCertificationUrl';
        break;
      case 'basic_life_support':
        documentField = 'basicLifeSupportUrl';
        break;
      case 'advanced_life_support':
        documentField = 'advancedLifeSupportUrl';
        break;
      case 'emt':
        documentField = 'emtCertificationUrl';
        break;
      case 'paramedic':
        documentField = 'paramedicCertificationUrl';
        break;
      default:
        return res.status(400).json({ message: "Invalid document type" });
    }

    console.log(`🔍 Mapped document field: ${documentField}`);

    // Forward to the existing verification endpoint logic
    const verified = true;
    const notes = '';

    // Get driver details to find the correct user ID
    let driverDetails = await storage.getDriverDetails(driverId);
    let userId = driverId;
    
    // If not found, check if driverId is actually a userId
    if (!driverDetails) {
      const user = await storage.getUser(driverId);
      if (user && user.role === 'driver') {
        const allUsers = await storage.getAllUsers();
        const allDriverDetails = await Promise.all(
          allUsers.filter(u => u.role === 'driver').map(u => storage.getDriverDetails(u.id))
        );
        driverDetails = allDriverDetails.find(dd => dd && dd.userId === driverId);
        userId = driverId;
      }
    }
    
    if (!driverDetails) {
      return res.status(404).json({ message: "Driver not found" });
    }
    
    // Map document field to verification field
    const updateData: any = {};
    switch (documentField) {
      case 'licensePhotoFront':
      case 'licensePhotoBack':
        updateData.licenseVerified = verified;
        if (!verified) updateData.licenseRejectionReason = notes || 'Document rejected';
        break;
      case 'insuranceDocumentUrl':
        updateData.insuranceVerified = verified;
        if (!verified) updateData.insuranceRejectionReason = notes || 'Document rejected';
        break;
      case 'vehicleRegistrationUrl':
        updateData.vehicleVerified = verified;
        if (!verified) updateData.vehicleRejectionReason = notes || 'Document rejected';
        break;
      case 'medicalCertificationUrl':
        updateData.medicalCertificationVerified = verified;
        if (!verified) updateData.medicalCertificationRejectionReason = notes || 'Document rejected';
        break;
      case 'backgroundCheckDocumentUrl':
        updateData.backgroundCheckVerified = verified;
        if (!verified) updateData.backgroundCheckRejectionReason = notes || 'Document rejected';
        break;
      case 'drugTestDocumentUrl':
        updateData.drugTestVerified = verified;
        if (!verified) updateData.drugTestRejectionReason = notes || 'Document rejected';
        break;
      case 'mvrRecordUrl':
        updateData.mvrRecordVerified = verified;
        if (!verified) updateData.mvrRecordRejectionReason = notes || 'Document rejected';
        break;
      case 'profilePhoto':
        updateData.profileVerified = verified;
        if (!verified) updateData.profileRejectionReason = notes || 'Document rejected';
        break;
      case 'cprFirstAidCertificationUrl':
        updateData.cprFirstAidCertificationVerified = verified;
        if (!verified) updateData.cprFirstAidCertificationRejectionReason = notes || 'Document rejected';
        break;
      case 'basicLifeSupportUrl':
        updateData.basicLifeSupportVerified = verified;
        if (!verified) updateData.basicLifeSupportRejectionReason = notes || 'Document rejected';
        break;
      case 'advancedLifeSupportUrl':
        updateData.advancedLifeSupportVerified = verified;
        if (!verified) updateData.advancedLifeSupportRejectionReason = notes || 'Document rejected';
        break;
      case 'emtCertificationUrl':
        updateData.emtCertificationVerified = verified;
        if (!verified) updateData.emtCertificationRejectionReason = notes || 'Document rejected';
        break;
      case 'paramedicCertificationUrl':
        updateData.paramedicCertificationVerified = verified;
        if (!verified) updateData.paramedicCertificationRejectionReason = notes || 'Document rejected';
        break;
      default:
        return res.status(400).json({ message: "Invalid document field" });
    }
    
    console.log(`🔍 UPDATE DATA (Frontend Endpoint):`, updateData);
    
    // Update driver details
    await storage.updateDriverDetails(driverDetails.userId, updateData);
    
    // Check if all required documents are now verified and activate account if so
    const updatedDriverDetails = await storage.getDriverDetails(driverDetails.userId);
    if (updatedDriverDetails && isAllDocumentsVerified(updatedDriverDetails)) {
      console.log(`🟢 ALL DOCUMENTS VERIFIED for driver ${driverDetails.userId} - Activating account`);
      await storage.updateDriverDetails(driverDetails.userId, {
        accountStatus: 'active',
        canAcceptRides: true,
        canViewRideRequests: true,
        backgroundCheckStatus: 'approved'
      });
    }
    
    res.json({ 
      success: true, 
      message: `Document ${documentType} approved successfully`,
      adminId: req.user.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error verifying document (frontend endpoint):", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Reject document endpoint  
router.post("/drivers/:driverId/reject-document", async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const driverId = parseInt(req.params.driverId);
    const { documentType, rejectionReason } = req.body;
    
    console.log(`🔍 REJECT DOCUMENT (Frontend Endpoint): Driver ${driverId}, Document Type: ${documentType}, Reason: ${rejectionReason}`);
    
    // Map frontend documentType to backend documentField
    let documentField = '';
    switch (documentType) {
      case 'license':
        documentField = 'licensePhotoFront'; // Use front as representative
        break;
      case 'insurance':
        documentField = 'insuranceDocumentUrl';
        break;
      case 'vehicle':
        documentField = 'vehicleRegistrationUrl';
        break;
      case 'profile':
        documentField = 'profilePhoto';
        break;
      case 'background':
        documentField = 'backgroundCheckDocumentUrl';
        break;
      case 'drug_test':
        documentField = 'drugTestDocumentUrl';
        break;
      case 'mvr':
        documentField = 'mvrRecordUrl';
        break;
      case 'medical':
        documentField = 'medicalCertificationUrl';
        break;
      case 'first_aid':
      case 'cpr_first_aid':
      case 'cprFirstAid':  // This is what the frontend actually sends
        documentField = 'cprFirstAidCertificationUrl';
        break;
      case 'basic_life_support':
        documentField = 'basicLifeSupportUrl';
        break;
      case 'advanced_life_support':
        documentField = 'advancedLifeSupportUrl';
        break;
      case 'emt':
        documentField = 'emtCertificationUrl';
        break;
      case 'paramedic':
        documentField = 'paramedicCertificationUrl';
        break;
      default:
        return res.status(400).json({ message: "Invalid document type" });
    }

    // Forward to the existing rejection endpoint logic
    const verified = false;
    const notes = rejectionReason || 'Document rejected';

    // Get driver details to find the correct user ID
    let driverDetails = await storage.getDriverDetails(driverId);
    let userId = driverId;
    
    // If not found, check if driverId is actually a userId
    if (!driverDetails) {
      const user = await storage.getUser(driverId);
      if (user && user.role === 'driver') {
        const allUsers = await storage.getAllUsers();
        const allDriverDetails = await Promise.all(
          allUsers.filter(u => u.role === 'driver').map(u => storage.getDriverDetails(u.id))
        );
        driverDetails = allDriverDetails.find(dd => dd && dd.userId === driverId);
        userId = driverId;
      }
    }
    
    if (!driverDetails) {
      return res.status(404).json({ message: "Driver not found" });
    }
    
    // Map document field to verification field
    const updateData: any = {};
    switch (documentField) {
      case 'licensePhotoFront':
      case 'licensePhotoBack':
        updateData.licenseVerified = verified;
        if (!verified) updateData.licenseRejectionReason = notes || 'Document rejected';
        break;
      case 'insuranceDocumentUrl':
        updateData.insuranceVerified = verified;
        if (!verified) updateData.insuranceRejectionReason = notes || 'Document rejected';
        break;
      case 'vehicleRegistrationUrl':
        updateData.vehicleVerified = verified;
        if (!verified) updateData.vehicleRejectionReason = notes || 'Document rejected';
        break;
      case 'medicalCertificationUrl':
        updateData.medicalCertificationVerified = verified;
        if (!verified) updateData.medicalCertificationRejectionReason = notes || 'Document rejected';
        break;
      case 'backgroundCheckDocumentUrl':
        updateData.backgroundCheckVerified = verified;
        if (!verified) updateData.backgroundCheckRejectionReason = notes || 'Document rejected';
        break;
      case 'drugTestDocumentUrl':
        updateData.drugTestVerified = verified;
        if (!verified) updateData.drugTestRejectionReason = notes || 'Document rejected';
        break;
      case 'mvrRecordUrl':
        updateData.mvrRecordVerified = verified;
        if (!verified) updateData.mvrRecordRejectionReason = notes || 'Document rejected';
        break;
      case 'profilePhoto':
        updateData.profileVerified = verified;
        if (!verified) updateData.profileRejectionReason = notes || 'Document rejected';
        break;
      case 'cprFirstAidCertificationUrl':
        updateData.cprFirstAidCertificationVerified = verified;
        if (!verified) updateData.cprFirstAidCertificationRejectionReason = notes || 'Document rejected';
        break;
      case 'basicLifeSupportUrl':
        updateData.basicLifeSupportVerified = verified;
        if (!verified) updateData.basicLifeSupportRejectionReason = notes || 'Document rejected';
        break;
      case 'advancedLifeSupportUrl':
        updateData.advancedLifeSupportVerified = verified;
        if (!verified) updateData.advancedLifeSupportRejectionReason = notes || 'Document rejected';
        break;
      case 'emtCertificationUrl':
        updateData.emtCertificationVerified = verified;
        if (!verified) updateData.emtCertificationRejectionReason = notes || 'Document rejected';
        break;
      case 'paramedicCertificationUrl':
        updateData.paramedicCertificationVerified = verified;
        if (!verified) updateData.paramedicCertificationRejectionReason = notes || 'Document rejected';
        break;
      default:
        return res.status(400).json({ message: "Invalid document field" });
    }
    
    console.log(`🔍 UPDATE DATA (Frontend Endpoint):`, updateData);
    
    // Update driver details
    await storage.updateDriverDetails(driverDetails.userId, updateData);

    // Send notification if document was rejected
    if (!verified && notes) {
      try {
        // Import notification service
        const { notificationService } = await import('../services/notification-service');
        
        const documentNameMap: Record<string, string> = {
          'licensePhotoFront': 'Driver License (Front)',
          'licensePhotoBack': 'Driver License (Back)',
          'insuranceDocumentUrl': 'Insurance Document',
          'vehicleRegistrationUrl': 'Vehicle Registration',
          'medicalCertificationUrl': 'Medical Certification',
          'backgroundCheckDocumentUrl': 'Background Check',
          'drugTestDocumentUrl': 'Drug Test Results',
          'mvrRecordUrl': 'MVR Record',
          'profilePhoto': 'Profile Photo',
          'cprFirstAidCertificationUrl': 'CPR/First Aid Certification',
          'basicLifeSupportUrl': 'Basic Life Support (BLS)',
          'advancedLifeSupportUrl': 'Advanced Life Support (ALS)',
          'emtCertificationUrl': 'EMT Certification',
          'paramedicCertificationUrl': 'Paramedic Certification'
        };
        
        const documentName = documentNameMap[documentField] || documentField;
        
        console.log(`📧 SENDING DOCUMENT REJECTION NOTIFICATION to user ${userId} for ${documentName}`);
        
        // Send document rejection notification
        await notificationService.sendDocumentRejectionNotification(
          userId,
          [documentName],
          [notes],
          true // unlock account
        );
        
        console.log(`✅ Document rejection notification sent successfully`);
      } catch (notificationError) {
        console.error("Error sending document rejection notification:", notificationError);
        // Don't fail the verification update if notification fails
      }
    }
    
    res.json({ 
      success: true, 
      message: `Document ${documentType} rejected successfully`,
      adminId: req.user.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error rejecting document (frontend endpoint):", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Approve driver endpoint (complete driver onboarding)
router.post("/drivers/:driverId/approve", async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const driverId = parseInt(req.params.driverId);
    
    console.log(`🔍 APPROVE DRIVER (Admin Action): Driver ${driverId}`);
    
    // Get driver details to find the correct user ID
    let driverDetails = await storage.getDriverDetails(driverId);
    let userId = driverId;
    
    // If not found, check if driverId is actually a userId
    if (!driverDetails) {
      const user = await storage.getUser(driverId);
      if (user && user.role === 'driver') {
        const allUsers = await storage.getAllUsers();
        const allDriverDetails = await Promise.all(
          allUsers.filter(u => u.role === 'driver').map(u => storage.getDriverDetails(u.id))
        );
        driverDetails = allDriverDetails.find(dd => dd && dd.userId === driverId);
        userId = driverId;
      }
    }
    
    if (!driverDetails) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // Update driver to be fully verified and active
    const updateData = {
      verified: true,
      backgroundCheckStatus: 'approved' as const,
      documentsVerified: true
    };

    console.log(`🔍 APPROVE DRIVER UPDATE DATA:`, updateData);
    
    // Update driver details
    await storage.updateDriverDetails(driverDetails.userId, updateData);
    
    // Also update the user's account status to active
    await storage.updateUser(driverDetails.userId, { accountStatus: 'active' });
    
    console.log(`✅ Driver ${driverId} (user ${driverDetails.userId}) has been fully approved and activated`);
    
    res.json({ 
      success: true, 
      message: `Driver has been approved and activated successfully`,
      adminId: req.user.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error approving driver:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// User action endpoint (handles activation, suspension, etc.)
router.post("/user-action", async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { action, userId, reason } = req.body;
    
    console.log(`🔍 USER ACTION (Admin): Action "${action}" for user ${userId}, reason: ${reason}`);
    
    if (!action || !userId) {
      return res.status(400).json({ message: "Action and userId are required" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let message = '';
    
    switch (action) {
      case 'activate':
        // Update user account status to active
        await storage.updateUser(userId, { accountStatus: 'active' });
        
        // If user is a driver, also update driver details to be fully verified
        if (user.role === 'driver') {
          const driverDetails = await storage.getDriverDetails(userId);
          if (driverDetails) {
            await storage.updateDriverDetails(userId, {
              verified: true,
              backgroundCheckStatus: 'approved' as const,
              documentsVerified: true
            });
          }
        }
        
        message = `${user.role === 'driver' ? 'Driver' : 'User'} ${user.fullName || user.username} has been activated successfully`;
        break;
        
      case 'suspend':
        await storage.updateUser(userId, { accountStatus: 'suspended' });
        message = `User ${user.fullName || user.username} has been suspended`;
        break;
        
      case 'deactivate':
        await storage.updateUser(userId, { accountStatus: 'inactive' });
        message = `User ${user.fullName || user.username} has been deactivated`;
        break;
        
      default:
        return res.status(400).json({ message: `Unknown action: ${action}` });
    }
    
    console.log(`✅ User action "${action}" completed successfully for user ${userId}`);
    
    res.json({ 
      success: true, 
      message,
      adminId: req.user.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error performing user action:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
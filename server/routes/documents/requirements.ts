import { Router, Request, Response } from 'express';
import { getDocumentRequirements, DOCUMENT_STATUS_MESSAGES } from '../../services/user-friendly-errors';

const router = Router();

// Get file requirements for document upload
router.get('/requirements/:documentType', (req: Request, res: Response) => {
  try {
    const { documentType } = req.params;
    const requirements = getDocumentRequirements(documentType);
    
    res.json({
      success: true,
      requirements: {
        ...requirements,
        acceptedFormats: requirements.formats.join(', '),
        sizeLimit: requirements.maxSize,
        uploadTips: requirements.tips
      }
    });
  } catch (error) {
    console.error('Error getting document requirements:', error);
    res.status(500).json({
      error: 'Failed to get requirements',
      action: 'Please try again or contact support'
    });
  }
});

// Get all document status messages
router.get('/status-info', (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      statusMessages: DOCUMENT_STATUS_MESSAGES
    });
  } catch (error) {
    console.error('Error getting status info:', error);
    res.status(500).json({
      error: 'Failed to get status information',
      action: 'Please try again or contact support'
    });
  }
});

// Validate file before upload (client-side validation support)
router.post('/validate', (req: Request, res: Response) => {
  try {
    const { fileName, fileSize, mimeType, documentType } = req.body;
    
    if (!fileName || !fileSize || !mimeType || !documentType) {
      return res.status(400).json({
        valid: false,
        error: 'Missing file information',
        action: 'Please provide complete file details'
      });
    }

    const requirements = getDocumentRequirements(documentType);
    const errors: string[] = [];
    
    // Check file size (convert MB to bytes)
    const maxSizeBytes = parseInt(requirements.maxSize) * 1024 * 1024;
    if (fileSize > maxSizeBytes) {
      errors.push(`File is too large (${(fileSize / 1024 / 1024).toFixed(1)}MB). Maximum size is ${requirements.maxSize}.`);
    }
    
    // Check file type
    const allowedTypes = requirements.formats.map(format => {
      switch (format) {
        case 'PDF': return 'application/pdf';
        case 'JPG': return 'image/jpeg';
        case 'PNG': return 'image/png';
        case 'WebP': return 'image/webp';
        default: return '';
      }
    }).filter(Boolean);
    
    if (!allowedTypes.includes(mimeType)) {
      errors.push(`File type not supported. Please use: ${requirements.formats.join(', ')}`);
    }
    
    // Check file name length
    if (fileName.length > 100) {
      errors.push('File name is too long. Please use a shorter name.');
    }
    
    if (errors.length > 0) {
      return res.json({
        valid: false,
        errors,
        suggestions: requirements.tips
      });
    }
    
    res.json({
      valid: true,
      message: 'File is ready for upload',
      requirements: requirements.tips
    });
    
  } catch (error) {
    console.error('Error validating file:', error);
    res.status(500).json({
      valid: false,
      error: 'Validation failed',
      action: 'Please try again or contact support'
    });
  }
});

export default router;
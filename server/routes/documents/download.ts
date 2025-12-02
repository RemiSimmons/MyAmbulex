import { Router, Request, Response } from 'express';

// Extend Request interface to include document
declare global {
  namespace Express {
    interface Request {
      document?: any;
    }
  }
}
import { storage } from '../../storage';
import { DocumentStorageService } from '../../services/document-storage-service';
import { UserErrorTranslator } from '../../services/user-friendly-errors';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import path from 'path';

const router = Router();
const documentStorageService = new DocumentStorageService();

// Authentication middleware with user-friendly errors
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    const error = UserErrorTranslator.translate('authentication_required');
    return res.status(401).json(UserErrorTranslator.formatForResponse(error));
  }
  next();
};

// Role-based access control for document downloads
const canAccessDocument = async (req: Request, res: Response, next: Function) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const user = req.user!;
    
    if (isNaN(documentId)) {
      const error = UserErrorTranslator.translate('server_error', user.role);
      return res.status(400).json(UserErrorTranslator.formatForResponse(error));
    }

    const document = await storage.getDocumentById(documentId);
    if (!document) {
      const error = UserErrorTranslator.translate('document_not_found', user.role);
      return res.status(404).json(UserErrorTranslator.formatForResponse(error));
    }

    // Check access permissions
    const hasAccess = 
      user.role === 'admin' || // Admins can access all documents
      user.id === document.userId || // Users can access their own documents
      (user.role === 'driver' && document.documentType && ['license', 'insurance', 'vehicle_registration'].includes(document.documentType)); // Basic driver document access

    if (!hasAccess) {
      const error = UserErrorTranslator.translate('access_denied', user.role);
      return res.status(403).json(UserErrorTranslator.formatForResponse(error));
    }

    req.document = document;
    next();
  } catch (error) {
    console.error('Error checking document access:', error);
    const userError = UserErrorTranslator.translate('server_error', req.user?.role);
    res.status(500).json(UserErrorTranslator.formatForResponse(userError));
  }
};

// Enhanced document download with caching and thumbnail support
router.get('/:documentId/download', isAuthenticated, canAccessDocument, async (req: Request, res: Response) => {
  try {
    const document = req.document!;
    const { thumbnail } = req.query;
    const thumbnailSize = (req.query.size as 'small' | 'medium' | 'large') || 'medium';
    
    // Get file path through document storage service
    const filePath = await documentStorageService.getDocumentPath(document.id);
    if (!filePath) {
      const error = UserErrorTranslator.translate('file_missing', req.user!.role);
      return res.status(404).json(UserErrorTranslator.formatForResponse(error));
    }

    let fileData: { buffer: Buffer; mimeType: string } | null = null;
    
    // Check if thumbnail is requested for images
    if (thumbnail === 'true' && document.mimeType?.startsWith('image/')) {
      fileData = await documentStorageService.getThumbnail(filePath, thumbnailSize);
      
      if (!fileData) {
        // Fallback to original image if thumbnail generation failed
        fileData = await documentStorageService.getDocumentFile(filePath);
      }
    } else {
      // Get original document with caching
      fileData = await documentStorageService.getDocumentFile(filePath);
    }

    if (!fileData) {
      const error = UserErrorTranslator.translate('file_missing', req.user!.role);
      return res.status(404).json(UserErrorTranslator.formatForResponse(error));
    }

    // Set headers for download/display
    res.setHeader('Content-Type', fileData.mimeType);
    res.setHeader('Content-Length', fileData.buffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour
    res.setHeader('ETag', `"${document.id}-${thumbnail ? 'thumb' : 'orig'}"`);

    // Send cached file buffer
    res.send(fileData.buffer);

    const logType = thumbnail === 'true' ? 'thumbnail' : 'document';
    console.log(`📥 ${logType} served: ${document.originalName} by user ${req.user!.id}`);
  } catch (error) {
    console.error('Error serving document:', error);
    if (!res.headersSent) {
      const userError = UserErrorTranslator.translate('server_error', req.user?.role);
      res.status(500).json(UserErrorTranslator.formatForResponse(userError));
    }
  }
});

// Basic document info endpoint (limited metadata)
router.get('/:documentId/info', isAuthenticated, canAccessDocument, async (req: Request, res: Response) => {
  try {
    const document = req.document!;
    
    // Limited document information - no advanced metadata
    const basicInfo = {
      id: document.id,
      filename: document.originalName,
      type: document.documentType,
      uploadedAt: document.uploadedAt,
      verificationStatus: document.verificationStatus,
      fileSize: document.fileSize,
      mimeType: document.mimeType
    };
    
    // Only show rejection reason to document owner or admin
    if (req.user!.role === 'admin' || req.user!.id === document.userId) {
      (basicInfo as any).rejectionReason = document.rejectionReason;
    }
    
    res.json({ document: basicInfo });
    
  } catch (error) {
    console.error('Error getting document info:', error);
    res.status(500).json({ error: 'Failed to get document info' });
  }
});

// Simple document list endpoint (limited filtering)
router.get('/my-documents', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { type, status } = req.query;
    
    // Basic filtering only
    let documents = await documentStorageService.getUserDocuments(userId);
    
    // Simple filtering - no advanced search
    if (type) {
      documents = documents.filter(doc => doc.documentType === type);
    }
    
    if (status) {
      documents = documents.filter(doc => doc.verificationStatus === status);
    }
    
    // Limited document list - basic info only
    const documentList = documents.map(doc => ({
      id: doc.id,
      filename: doc.originalName,
      type: doc.documentType,
      uploadedAt: doc.uploadedAt,
      verificationStatus: doc.verificationStatus,
      fileSize: doc.fileSize,
      downloadUrl: `/api/documents/${doc.id}/download`
    }));
    
    res.json({ 
      documents: documentList,
      total: documentList.length,
      hasAdvancedFeatures: false // Indicate limited functionality
    });
    
  } catch (error) {
    console.error('Error getting user documents:', error);
    res.status(500).json({ error: 'Failed to get documents' });
  }
});

// Check download limits (basic rate limiting)
const downloadAttempts = new Map<number, { count: number; resetTime: number }>();
const DOWNLOAD_LIMIT = 10; // 10 downloads per hour per user
const LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

const checkDownloadLimit = (req: Request, res: Response, next: Function) => {
  const userId = req.user!.id;
  const now = Date.now();
  
  const userAttempts = downloadAttempts.get(userId);
  
  if (!userAttempts || now > userAttempts.resetTime) {
    // Reset or initialize
    downloadAttempts.set(userId, { count: 1, resetTime: now + LIMIT_WINDOW });
    next();
    return;
  }
  
  if (userAttempts.count >= DOWNLOAD_LIMIT) {
    return res.status(429).json({ 
      error: 'Download limit exceeded',
      message: 'Maximum 10 downloads per hour',
      resetTime: new Date(userAttempts.resetTime).toISOString()
    });
  }
  
  userAttempts.count++;
  next();
};

// Apply rate limiting to downloads
router.use('/:documentId/download', checkDownloadLimit);

export default router;
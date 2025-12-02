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
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import path from 'path';

const router = Router();
const documentStorageService = new DocumentStorageService();

// Authentication middleware
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Role-based access control for document previews
const canPreviewDocument = async (req: Request, res: Response, next: Function) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const user = req.user!;
    
    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const document = await storage.getDocumentById(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check access permissions (same as download)
    const hasAccess = 
      user.role === 'admin' || 
      user.id === document.userId || 
      (user.role === 'driver' && document.documentType && ['license', 'insurance', 'vehicle_registration'].includes(document.documentType));

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    req.document = document;
    next();
  } catch (error) {
    console.error('Error checking document preview access:', error);
    res.status(500).json({ error: 'Access check failed' });
  }
};

// Document preview endpoint - serves document for inline viewing
router.get('/:documentId/preview', isAuthenticated, canPreviewDocument, async (req: Request, res: Response) => {
  try {
    const document = req.document!;
    
    // Check if document type supports preview
    const previewableTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'];
    if (!previewableTypes.includes(document.mimeType)) {
      return res.status(400).json({ 
        error: 'Preview not supported for this file type',
        supportedTypes: previewableTypes
      });
    }

    // Get file path
    const filePath = await documentStorageService.getDocumentPath(document.id);
    if (!filePath) {
      return res.status(404).json({ error: 'Document file not found' });
    }

    // Get file stats
    const fileStats = await stat(filePath);
    
    // Set headers for inline viewing (not download)
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Length', fileStats.size.toString());
    res.setHeader('Content-Disposition', `inline; filename="${document.originalName}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Stream file for preview
    const readStream = createReadStream(filePath);
    
    readStream.on('error', (error: any) => {
      console.error('Preview stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Preview failed' });
      }
    });

    readStream.pipe(res);
    
    // Log preview for audit
    console.log(`👁️ Document previewed: ${document.filename} by user ${req.user!.id}`);
    
  } catch (error) {
    console.error('Error previewing document:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Preview failed' });
    }
  }
});

// Preview metadata endpoint - returns preview capabilities and info
router.get('/:documentId/preview-info', isAuthenticated, canPreviewDocument, async (req: Request, res: Response) => {
  try {
    const document = req.document!;
    
    const previewableTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'];
    const isPreviewable = previewableTypes.includes(document.mimeType);
    
    const previewInfo = {
      id: document.id,
      filename: document.originalName,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      isPreviewable,
      previewUrl: isPreviewable ? `/api/documents/${document.id}/preview` : null,
      previewType: getPreviewType(document.mimeType),
      supportedTypes: previewableTypes
    };
    
    res.json({ preview: previewInfo });
    
  } catch (error) {
    console.error('Error getting preview info:', error);
    res.status(500).json({ error: 'Failed to get preview info' });
  }
});

// Helper function to determine preview type
function getPreviewType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'text/plain') return 'text';
  return 'unsupported';
}

export default router;
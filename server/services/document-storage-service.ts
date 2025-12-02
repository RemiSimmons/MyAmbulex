import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { storage } from '../storage';
import type { InsertDocument } from '@shared/schema';
import { documentCacheService } from './document-cache-service';
import { thumbnailService } from './thumbnail-service';
import { supabaseStorage } from '../utils/supabase-storage';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const access = promisify(fs.access);

// Use Supabase Storage if configured, otherwise fall back to local filesystem
const USE_SUPABASE_STORAGE = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

export class DocumentStorageService {
  private baseUploadPath = './uploads';

  constructor() {
    if (!USE_SUPABASE_STORAGE) {
      this.ensureDirectoryStructure();
    }
  }

  private async ensureDirectoryStructure() {
    try {
      const directories = [
        this.baseUploadPath,
        path.join(this.baseUploadPath, 'documents'),
        path.join(this.baseUploadPath, 'chat'),
        path.join(this.baseUploadPath, 'temp')
      ];

      for (const dir of directories) {
        try {
          await access(dir);
        } catch {
          await mkdir(dir, { recursive: true });
          console.log(`📁 Created directory: ${dir}`);
        }
      }
    } catch (error) {
      console.error('Error ensuring directory structure:', error);
    }
  }

  async saveDocument(
    file: Express.Multer.File, 
    userId: number, 
    documentType: string
  ): Promise<{ document: any; filePath: string }> {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 9);
      const fileExtension = path.extname(file.originalname);
      const filename = `${documentType}-${timestamp}-${random}${fileExtension}`;
      
      let filePath: string;
      let storageUrl: string | undefined;

      if (USE_SUPABASE_STORAGE) {
        // Upload to Supabase Storage
        console.log(`☁️ Using Supabase Storage for document upload`);
        
        const uploadResult = await supabaseStorage.uploadDocument(
          file.buffer,
          userId,
          documentType,
          filename,
          file.mimetype
        );

        filePath = uploadResult.path; // Storage path in Supabase
        storageUrl = uploadResult.url; // Public/signed URL
        
        console.log(`✅ Document uploaded to Supabase Storage: ${filePath}`);
      } else {
        // Fall back to local filesystem
        console.log(`💾 Using local filesystem for document upload`);
        
        // Create user-specific directory
        const userDir = path.join(this.baseUploadPath, 'documents', `user_${userId}`);
        await mkdir(userDir, { recursive: true });
        
        // Full file path
        filePath = path.join(userDir, filename);
        
        // Save file to local filesystem
        await writeFile(filePath, file.buffer);
        console.log(`💾 File written to local filesystem: ${filePath}`);
      }
      
      // Cache the document for faster future access (async for performance)
      setImmediate(async () => {
        try {
          await documentCacheService.set(filePath, file.buffer, file.mimetype);
          // Generate thumbnails for images
          if (file.mimetype.startsWith('image/')) {
            await thumbnailService.generateThumbnails(filePath, file.buffer, file.mimetype);
          }
        } catch (error) {
          console.error('Error in async cache/thumbnail generation:', error);
        }
      });
      
      // Save document record to database
      const documentData: InsertDocument = {
        userId,
        documentType,
        filename,
        originalName: file.originalname,
        filePath: USE_SUPABASE_STORAGE ? filePath : filePath, // Store storage path or local path
        fileSize: file.size,
        mimeType: file.mimetype,
        verificationStatus: 'pending'
      };

      const document = await storage.saveDocument(documentData);
      
      // If using Supabase Storage, also store the URL in a separate field if needed
      // (You might want to add a 'storageUrl' field to your documents table)
      
      console.log(`📄 Document saved: ${filename} for user ${userId}`);
      
      return { document, filePath };
    } catch (error) {
      console.error('Error saving document:', error);
      throw error;
    }
  }

  async getDocumentPath(documentId: number): Promise<string | null> {
    try {
      const document = await storage.getDocumentById(documentId);
      if (!document) {
        return null;
      }

      if (USE_SUPABASE_STORAGE) {
        // For Supabase Storage, return the storage path
        return document.filePath;
      } else {
        // For local filesystem, check if file exists
        try {
          await access(document.filePath);
          return document.filePath;
        } catch {
          console.warn(`Document file not found: ${document.filePath}`);
          return null;
        }
      }
    } catch (error) {
      console.error('Error getting document path:', error);
      return null;
    }
  }

  async deleteDocument(documentId: number): Promise<boolean> {
    try {
      const document = await storage.getDocumentById(documentId);
      if (!document) {
        return false;
      }

      if (USE_SUPABASE_STORAGE) {
        // Delete from Supabase Storage
        const deleted = await supabaseStorage.deleteDocument(document.filePath);
        if (!deleted) {
          console.warn(`Failed to delete file from Supabase Storage: ${document.filePath}`);
        }
      } else {
        // Delete from local filesystem
        try {
          await unlink(document.filePath);
          console.log(`🗑️ Deleted file: ${document.filePath}`);
        } catch (error) {
          console.warn(`Failed to delete file ${document.filePath}:`, error);
          // Continue with database deletion even if file deletion fails
        }
      }

      // Delete from database
      return await storage.deleteDocument(documentId);
    } catch (error) {
      console.error('Error deleting document:', error);
      return false;
    }
  }

  async getUserDocuments(userId: number, documentType?: string) {
    return await storage.getUserDocuments(userId, documentType);
  }

  // Admin retrieval methods
  async getAllDocuments(filters: any = {}, pagination: { limit: number; offset: number }) {
    return await storage.getAllDocuments(filters, pagination);
  }

  async getDocumentsByStatus(status: string) {
    return await storage.getDocumentsByStatus(status);
  }

  async getDocumentStatistics() {
    return await storage.getDocumentStatistics();
  }

  async getDocumentById(documentId: number) {
    return await storage.getDocumentById(documentId);
  }

  async updateDocumentVerification(
    documentId: number, 
    status: 'pending' | 'approved' | 'rejected',
    verifiedBy?: number,
    rejectionReason?: string
  ) {
    return await storage.updateDocumentVerification(documentId, status, verifiedBy, rejectionReason);
  }

  // Security validation
  validateFileType(file: Express.Multer.File): boolean {
    const allowedMimes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'application/pdf',
      'image/webp'
    ];
    return allowedMimes.includes(file.mimetype);
  }

  validateFileSize(file: Express.Multer.File): boolean {
    const maxSize = 10 * 1024 * 1024; // 10MB
    return file.size <= maxSize;
  }

  async getDocumentFile(filePath: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    try {
      // Determine MIME type from file extension
      const extension = path.extname(filePath).toLowerCase();
      const mimeType = this.getMimeType(extension);
      
      // Try cache first
      const cachedDocument = await documentCacheService.get(filePath, mimeType);
      if (cachedDocument) {
        return {
          buffer: cachedDocument.data,
          mimeType: cachedDocument.mimeType
        };
      }
      
      if (USE_SUPABASE_STORAGE) {
        // Download from Supabase Storage
        console.log(`📥 Downloading from Supabase Storage: ${filePath}`);
        const buffer = await supabaseStorage.downloadDocument(filePath);
        
        if (!buffer) {
          console.warn(`⚠️ Failed to download from Supabase Storage: ${filePath}`);
          return null;
        }

        // Cache for future requests
        await documentCacheService.set(filePath, buffer, mimeType);
        
        return {
          buffer,
          mimeType
        };
      } else {
        // Cache miss - read from filesystem
        console.log(`📁 Cache MISS, reading from disk: ${path.basename(filePath)}`);
        
        // Check if file exists
        await access(filePath);
        
        // Read file
        const fileBuffer = await readFile(filePath);
        
        // Cache for future requests
        await documentCacheService.set(filePath, fileBuffer, mimeType);
        
        return {
          buffer: fileBuffer,
          mimeType
        };
      }
    } catch (error) {
      console.error('Error reading document file:', error);
      return null;
    }
  }

  async getThumbnail(filePath: string, size: 'small' | 'medium' | 'large' = 'medium'): Promise<{ buffer: Buffer; mimeType: string } | null> {
    try {
      const thumbnailBuffer = await thumbnailService.getThumbnail(filePath, size);
      if (thumbnailBuffer) {
        return {
          buffer: thumbnailBuffer,
          mimeType: thumbnailService.getThumbnailMimeType()
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting thumbnail:', error);
      return null;
    }
  }

  /**
   * Get document URL (for Supabase Storage) or path (for local filesystem)
   */
  async getDocumentUrl(filePath: string, signed: boolean = false): Promise<string | null> {
    if (USE_SUPABASE_STORAGE) {
      if (signed) {
        // Get signed URL for private access
        return await supabaseStorage.getSignedUrl(filePath, 3600); // 1 hour expiry
      } else {
        // Get public URL
        return supabaseStorage.getPublicUrl(filePath);
      }
    } else {
      // For local filesystem, return the path (will be served via /uploads route)
      return `/uploads/${filePath.replace(/^\.\/uploads\//, '')}`;
    }
  }

  private getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif'
    };
    return mimeTypes[extension] || 'application/octet-stream';
  }
}

export const documentStorageService = new DocumentStorageService();

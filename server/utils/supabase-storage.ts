/**
 * Supabase Storage Client Utility
 * Handles document storage in Supabase Storage buckets
 * 
 * Note: This module uses lazy initialization to avoid throwing errors
 * when Supabase is not configured. Methods will throw errors if called
 * when Supabase is not properly configured.
 */

import 'dotenv/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Storage bucket name for documents
const DOCUMENTS_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'driver-documents';

// Lazy initialization - only create client when needed
let supabase: SupabaseClient | null = null;

/**
 * Check if Supabase is configured
 */
function isSupabaseConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Get or create Supabase client (lazy initialization)
 * Throws error if Supabase is not configured
 */
function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.');
  }
  
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }
  
  return supabase;
}

export interface UploadResult {
  path: string;
  url: string;
  publicUrl?: string;
}

export class SupabaseStorageService {
  private bucket: string;

  constructor(bucketName: string = DOCUMENTS_BUCKET) {
    this.bucket = bucketName;
  }

  /**
   * Upload a document to Supabase Storage
   */
  async uploadDocument(
    file: Buffer,
    userId: number,
    documentType: string,
    filename: string,
    mimeType: string
  ): Promise<UploadResult> {
    const client = getSupabaseClient();
    
    try {
      // Create path: user_{userId}/{documentType}-{filename}
      const storagePath = `user_${userId}/${documentType}-${filename}`;

      console.log(`📤 Uploading to Supabase Storage: ${storagePath}`);

      // Upload file
      const { data, error } = await client.storage
        .from(this.bucket)
        .upload(storagePath, file, {
          contentType: mimeType,
          upsert: false, // Don't overwrite existing files
          cacheControl: '3600', // Cache for 1 hour
        });

      if (error) {
        console.error('❌ Supabase Storage upload error:', error);
        throw new Error(`Failed to upload document: ${error.message}`);
      }

      // Get public URL (for public buckets) or signed URL (for private buckets)
      const { data: urlData } = client.storage
        .from(this.bucket)
        .getPublicUrl(storagePath);

      console.log(`✅ Document uploaded successfully: ${storagePath}`);

      return {
        path: storagePath,
        url: urlData.publicUrl,
        publicUrl: urlData.publicUrl
      };
    } catch (error) {
      console.error('Error uploading document to Supabase Storage:', error);
      throw error;
    }
  }

  /**
   * Download a document from Supabase Storage
   */
  async downloadDocument(storagePath: string): Promise<Buffer | null> {
    const client = getSupabaseClient();
    
    try {
      console.log(`📥 Downloading from Supabase Storage: ${storagePath}`);

      const { data, error } = await client.storage
        .from(this.bucket)
        .download(storagePath);

      if (error) {
        console.error('❌ Supabase Storage download error:', error);
        return null;
      }

      if (!data) {
        console.warn(`⚠️ No data returned for path: ${storagePath}`);
        return null;
      }

      // Convert Blob to Buffer
      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      console.log(`✅ Document downloaded successfully: ${storagePath}`);
      return buffer;
    } catch (error) {
      console.error('Error downloading document from Supabase Storage:', error);
      return null;
    }
  }

  /**
   * Get a signed URL for private document access
   */
  async getSignedUrl(storagePath: string, expiresIn: number = 3600): Promise<string | null> {
    const client = getSupabaseClient();
    
    try {
      const { data, error } = await client.storage
        .from(this.bucket)
        .createSignedUrl(storagePath, expiresIn);

      if (error) {
        console.error('❌ Error creating signed URL:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
  }

  /**
   * Delete a document from Supabase Storage
   */
  async deleteDocument(storagePath: string): Promise<boolean> {
    const client = getSupabaseClient();
    
    try {
      console.log(`🗑️ Deleting from Supabase Storage: ${storagePath}`);

      const { data, error } = await client.storage
        .from(this.bucket)
        .remove([storagePath]);

      if (error) {
        console.error('❌ Supabase Storage delete error:', error);
        return false;
      }

      console.log(`✅ Document deleted successfully: ${storagePath}`);
      return true;
    } catch (error) {
      console.error('Error deleting document from Supabase Storage:', error);
      return false;
    }
  }

  /**
   * Check if a document exists in Supabase Storage
   */
  async documentExists(storagePath: string): Promise<boolean> {
    const client = getSupabaseClient();
    
    try {
      const { data, error } = await client.storage
        .from(this.bucket)
        .list(storagePath.split('/').slice(0, -1).join('/'), {
          search: storagePath.split('/').pop()
        });

      if (error) {
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get public URL for a document
   */
  getPublicUrl(storagePath: string): string {
    const client = getSupabaseClient();
    const { data } = client.storage
      .from(this.bucket)
      .getPublicUrl(storagePath);
    
    return data.publicUrl;
  }

  /**
   * List all documents for a user
   */
  async listUserDocuments(userId: number): Promise<string[]> {
    const client = getSupabaseClient();
    
    try {
      const { data, error } = await client.storage
        .from(this.bucket)
        .list(`user_${userId}`);

      if (error) {
        console.error('❌ Error listing user documents:', error);
        return [];
      }

      return data?.map(file => `user_${userId}/${file.name}`) || [];
    } catch (error) {
      console.error('Error listing user documents:', error);
      return [];
    }
  }
}

// Export singleton instance
export const supabaseStorage = new SupabaseStorageService();

// Export function to get Supabase client (for advanced operations)
// Note: This will throw if Supabase is not configured
export function getSupabaseClientForAdvancedOps(): SupabaseClient {
  return getSupabaseClient();
}



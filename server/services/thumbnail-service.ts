import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const access = promisify(fs.access);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

/**
 * Simple thumbnail generation service for images
 * Optimized for beta launch - basic thumbnail creation for common formats
 */
export class ThumbnailService {
  private thumbnailPath = './uploads/thumbnails';
  private thumbnailSizes = {
    small: { width: 150, height: 150 },
    medium: { width: 300, height: 300 },
    large: { width: 600, height: 600 }
  };

  constructor() {
    this.ensureThumbnailDirectory();
  }

  private async ensureThumbnailDirectory() {
    try {
      await access(this.thumbnailPath);
    } catch {
      await mkdir(this.thumbnailPath, { recursive: true });
      console.log(`📁 Created thumbnail directory: ${this.thumbnailPath}`);
    }
  }

  private getThumbnailPath(originalPath: string, size: 'small' | 'medium' | 'large'): string {
    const filename = path.basename(originalPath, path.extname(originalPath));
    const userId = this.extractUserIdFromPath(originalPath);
    return path.join(this.thumbnailPath, `user_${userId}`, `${filename}_${size}.webp`);
  }

  private extractUserIdFromPath(filePath: string): string {
    const match = filePath.match(/user_(\d+)/);
    return match ? match[1] : 'unknown';
  }

  private isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/') && !mimeType.includes('svg');
  }

  async generateThumbnails(
    originalPath: string, 
    imageBuffer: Buffer, 
    mimeType: string
  ): Promise<{ small: string; medium: string; large: string } | null> {
    
    if (!this.isImageFile(mimeType)) {
      return null; // Not an image, no thumbnails needed
    }

    try {
      const userId = this.extractUserIdFromPath(originalPath);
      const userThumbnailDir = path.join(this.thumbnailPath, `user_${userId}`);
      await mkdir(userThumbnailDir, { recursive: true });

      const thumbnailPaths: { small: string; medium: string; large: string } = {
        small: '',
        medium: '',
        large: ''
      };

      // Generate thumbnails for each size
      for (const [sizeName, dimensions] of Object.entries(this.thumbnailSizes)) {
        const thumbnailPath = this.getThumbnailPath(originalPath, sizeName as keyof typeof this.thumbnailSizes);
        
        const thumbnailBuffer = await sharp(imageBuffer)
          .resize(dimensions.width, dimensions.height, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({ quality: 80 }) // Convert to WebP for better compression
          .toBuffer();

        await writeFile(thumbnailPath, thumbnailBuffer);
        thumbnailPaths[sizeName as keyof typeof thumbnailPaths] = thumbnailPath;
        
        console.log(`🖼️ Generated ${sizeName} thumbnail: ${path.basename(thumbnailPath)}`);
      }

      return thumbnailPaths;
    } catch (error) {
      console.error('Error generating thumbnails:', error);
      return null;
    }
  }

  async getThumbnail(originalPath: string, size: 'small' | 'medium' | 'large' = 'medium'): Promise<Buffer | null> {
    try {
      const thumbnailPath = this.getThumbnailPath(originalPath, size);
      await access(thumbnailPath);
      
      const thumbnailBuffer = await fs.promises.readFile(thumbnailPath);
      console.log(`⚡ Thumbnail served: ${size} for ${path.basename(originalPath)}`);
      return thumbnailBuffer;
    } catch {
      return null; // Thumbnail doesn't exist
    }
  }

  async thumbnailExists(originalPath: string, size: 'small' | 'medium' | 'large' = 'medium'): Promise<boolean> {
    try {
      const thumbnailPath = this.getThumbnailPath(originalPath, size);
      await access(thumbnailPath);
      return true;
    } catch {
      return false;
    }
  }

  getThumbnailMimeType(): string {
    return 'image/webp';
  }

  getServiceStats() {
    return {
      thumbnailSizes: this.thumbnailSizes,
      outputFormat: 'WebP',
      compressionQuality: 80,
      supportedFormats: ['JPEG', 'PNG', 'GIF', 'TIFF', 'WebP']
    };
  }
}

export const thumbnailService = new ThumbnailService();
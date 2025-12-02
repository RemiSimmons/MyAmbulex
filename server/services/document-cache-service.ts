import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const access = promisify(fs.access);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

/**
 * Simple in-memory and disk cache for frequently accessed documents
 * Designed for beta launch - keeps it simple while improving performance
 */
export class DocumentCacheService {
  private memoryCache = new Map<string, { data: Buffer; mimeType: string; timestamp: number; size: number }>();
  private cachePath = './uploads/cache';
  private maxMemoryCacheSize = 50 * 1024 * 1024; // 50MB memory cache
  private maxCacheAge = 30 * 60 * 1000; // 30 minutes cache lifetime
  private currentMemoryUsage = 0;

  constructor() {
    this.ensureCacheDirectory();
    this.startCleanupTimer();
  }

  private async ensureCacheDirectory() {
    try {
      await access(this.cachePath);
    } catch {
      await mkdir(this.cachePath, { recursive: true });
      console.log(`📁 Created cache directory: ${this.cachePath}`);
    }
  }

  private getCacheKey(filePath: string): string {
    return Buffer.from(filePath).toString('base64').replace(/[/+=]/g, '_');
  }

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.maxCacheAge;
  }

  private startCleanupTimer() {
    // Clean expired cache entries every 10 minutes
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 10 * 60 * 1000);
  }

  private cleanupExpiredEntries() {
    const now = Date.now();
    let cleanedEntries = 0;

    const entries = Array.from(this.memoryCache.entries());
    for (const [key, entry] of entries) {
      if (this.isExpired(entry.timestamp)) {
        this.currentMemoryUsage -= entry.size;
        this.memoryCache.delete(key);
        cleanedEntries++;
      }
    }

    if (cleanedEntries > 0) {
      console.log(`🧹 Cleaned ${cleanedEntries} expired cache entries`);
    }
  }

  private evictLeastRecentlyUsed() {
    // Simple LRU eviction - remove oldest entries when memory limit reached
    const entries = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    while (this.currentMemoryUsage > this.maxMemoryCacheSize && entries.length > 0) {
      const [key, entry] = entries.shift()!;
      this.currentMemoryUsage -= entry.size;
      this.memoryCache.delete(key);
    }
  }

  async get(filePath: string, mimeType: string): Promise<{ data: Buffer; mimeType: string } | null> {
    const cacheKey = this.getCacheKey(filePath);
    
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(cacheKey);
    if (memoryEntry && !this.isExpired(memoryEntry.timestamp)) {
      console.log(`⚡ Cache HIT (memory): ${path.basename(filePath)}`);
      // Update timestamp for LRU
      memoryEntry.timestamp = Date.now();
      return { data: memoryEntry.data, mimeType: memoryEntry.mimeType };
    }

    // Check disk cache
    const diskCachePath = path.join(this.cachePath, cacheKey);
    try {
      await access(diskCachePath);
      const data = await readFile(diskCachePath);
      
      // Add to memory cache if space allows
      if (data.length + this.currentMemoryUsage <= this.maxMemoryCacheSize) {
        this.memoryCache.set(cacheKey, {
          data,
          mimeType,
          timestamp: Date.now(),
          size: data.length
        });
        this.currentMemoryUsage += data.length;
      }

      console.log(`⚡ Cache HIT (disk): ${path.basename(filePath)}`);
      return { data, mimeType };
    } catch {
      // Cache miss
      return null;
    }
  }

  async set(filePath: string, data: Buffer, mimeType: string): Promise<void> {
    const cacheKey = this.getCacheKey(filePath);
    const timestamp = Date.now();

    // Always cache to disk for persistence
    const diskCachePath = path.join(this.cachePath, cacheKey);
    try {
      await writeFile(diskCachePath, data);
    } catch (error) {
      console.error('Error writing to disk cache:', error);
    }

    // Cache in memory if space allows
    if (data.length + this.currentMemoryUsage <= this.maxMemoryCacheSize) {
      // Evict old entries if needed
      if (this.currentMemoryUsage + data.length > this.maxMemoryCacheSize) {
        this.evictLeastRecentlyUsed();
      }

      this.memoryCache.set(cacheKey, {
        data,
        mimeType,
        timestamp,
        size: data.length
      });
      this.currentMemoryUsage += data.length;
      
      console.log(`📦 Cached to memory: ${path.basename(filePath)} (${(data.length / 1024).toFixed(1)}KB)`);
    } else {
      console.log(`📦 Cached to disk only: ${path.basename(filePath)} (too large for memory)`);
    }
  }

  getCacheStats() {
    const memoryEntries = this.memoryCache.size;
    const memoryUsageMB = (this.currentMemoryUsage / 1024 / 1024).toFixed(2);
    const maxMemoryMB = (this.maxMemoryCacheSize / 1024 / 1024).toFixed(2);
    
    return {
      memoryEntries,
      memoryUsage: `${memoryUsageMB}MB / ${maxMemoryMB}MB`,
      cacheHitRate: 'N/A', // Would require hit/miss tracking
      maxAge: `${this.maxCacheAge / 1000 / 60} minutes`
    };
  }

  clear() {
    this.memoryCache.clear();
    this.currentMemoryUsage = 0;
    console.log('🧹 Document cache cleared');
  }
}

export const documentCacheService = new DocumentCacheService();
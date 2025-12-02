import { Router } from 'express';
import type { Request, Response } from 'express';
import { isAuthenticated } from '../../middleware/auth';

// Simple admin role check
const requireAdmin = (req: Request, res: Response, next: Function) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
import { documentCacheService } from '../../services/document-cache-service';
import { thumbnailService } from '../../services/thumbnail-service';

const router = Router();

// Get performance metrics and cache statistics (Admin only)
router.get('/api/admin/performance/cache-stats', isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
  try {
    const cacheStats = documentCacheService.getCacheStats();
    const thumbnailStats = thumbnailService.getServiceStats();
    
    res.json({
      success: true,
      data: {
        documentCache: cacheStats,
        thumbnailService: thumbnailStats,
        timestamp: new Date().toISOString(),
        systemInfo: {
          nodeVersion: process.version,
          platform: process.platform,
          uptime: `${Math.floor(process.uptime() / 60)} minutes`,
          memoryUsage: {
            rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
          }
        }
      }
    });
  } catch (error) {
    console.error('Error getting performance stats:', error);
    res.status(500).json({ error: 'Failed to retrieve performance statistics' });
  }
});

// Clear document cache (Admin only)
router.post('/api/admin/performance/clear-cache', isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
  try {
    documentCacheService.clear();
    
    res.json({
      success: true,
      message: 'Document cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

export default router;
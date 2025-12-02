import { Router } from 'express';
import { isAuthenticated, hasRole } from '../middleware/auth';
import os from 'os';
import fs from 'fs';
import { promisify } from 'util';

const router = Router();
const readFile = promisify(fs.readFile);

// Get system health overview
router.get('/system-health', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    const health = {
      status: 'healthy' as const,
      score: 95,
      issues: [] as string[],
      lastUpdated: new Date().toISOString()
    };

    // Check various system components
    const cpuUsage = await getCpuUsage();
    const memoryUsage = getMemoryUsage();
    const diskUsage = await getDiskUsage();

    // Determine health status based on metrics
    if (cpuUsage > 80) {
      health.issues.push('High CPU usage detected');
      health.score -= 10;
    }

    if (memoryUsage.percentage > 85) {
      health.issues.push('High memory usage detected');
      health.score -= 10;
    }

    if (diskUsage.percentage > 90) {
      health.issues.push('Low disk space available');
      health.score -= 15;
    }

    // Set status based on score
    if (health.score < 70) {
      health.status = 'critical';
    } else if (health.score < 85) {
      health.status = 'warning';
    }

    res.json(health);
  } catch (error) {
    console.error('Error fetching system health:', error);
    res.status(500).json({ message: 'Failed to fetch system health' });
  }
});

// Get performance metrics
router.get('/performance-metrics', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    // Mock performance metrics - in production, these would come from APM tools
    const metrics = {
      responseTime: {
        current: Math.round(Math.random() * 50 + 50), // 50-100ms
        average: Math.round(Math.random() * 30 + 70), // 70-100ms
        trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'stable'
      },
      throughput: {
        requestsPerSecond: Math.round(Math.random() * 100 + 50), // 50-150 req/s
        trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'stable'
      },
      errorRate: {
        current: Math.round((Math.random() * 2) * 100) / 100, // 0-2%
        threshold: 5,
        trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'stable'
      },
      uptime: {
        percentage: 99.9,
        duration: formatUptime(process.uptime())
      }
    };

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({ message: 'Failed to fetch performance metrics' });
  }
});

// Get resource usage
router.get('/resource-usage', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    const cpuUsage = await getCpuUsage();
    const memoryUsage = getMemoryUsage();
    const diskUsage = await getDiskUsage();
    const networkUsage = getNetworkUsage();

    const resourceUsage = {
      cpu: {
        usage: cpuUsage,
        cores: os.cpus().length,
        load: os.loadavg()
      },
      memory: memoryUsage,
      disk: diskUsage,
      network: networkUsage
    };

    res.json(resourceUsage);
  } catch (error) {
    console.error('Error fetching resource usage:', error);
    res.status(500).json({ message: 'Failed to fetch resource usage' });
  }
});

// Get database metrics
router.get('/database-metrics', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    // Mock database metrics - in production, these would come from database monitoring
    const metrics = {
      connections: {
        active: Math.round(Math.random() * 10 + 5), // 5-15 active
        idle: Math.round(Math.random() * 20 + 10), // 10-30 idle
        total: 50,
        maxConnections: 100
      },
      queries: {
        perSecond: Math.round(Math.random() * 50 + 25), // 25-75 queries/sec
        slowQueries: Math.round(Math.random() * 3), // 0-3 slow queries
        averageTime: Math.round(Math.random() * 20 + 10) // 10-30ms average
      },
      storage: {
        size: 1024 * 1024 * 1024 * 2.5, // 2.5GB
        growth: Math.round((Math.random() * 2 + 1) * 100) / 100, // 1-3% growth
        indexEfficiency: Math.round(Math.random() * 10 + 85) // 85-95% efficiency
      }
    };

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching database metrics:', error);
    res.status(500).json({ message: 'Failed to fetch database metrics' });
  }
});

// Helper functions
async function getCpuUsage(): Promise<number> {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times];
    }
    totalIdle += cpu.times.idle;
  });

  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;
  const usage = 100 - Math.floor((idle / total) * 100);

  return Math.max(0, Math.min(100, usage));
}

function getMemoryUsage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const percentage = Math.round((usedMemory / totalMemory) * 100);

  return {
    used: usedMemory,
    total: totalMemory,
    percentage
  };
}

async function getDiskUsage() {
  try {
    // This is a simplified approach - in production, you'd use proper disk monitoring
    const stats = await promisify(fs.stat)(__dirname);
    
    // Mock disk usage for demo
    const totalDisk = 1024 * 1024 * 1024 * 100; // 100GB
    const usedDisk = 1024 * 1024 * 1024 * 45; // 45GB
    const percentage = Math.round((usedDisk / totalDisk) * 100);

    return {
      used: usedDisk,
      total: totalDisk,
      percentage
    };
  } catch (error) {
    // Fallback mock data
    return {
      used: 1024 * 1024 * 1024 * 45,
      total: 1024 * 1024 * 1024 * 100,
      percentage: 45
    };
  }
}

function getNetworkUsage() {
  // Mock network usage - in production, this would come from system monitoring
  return {
    inbound: Math.round(Math.random() * 1024 * 1024 * 10), // 0-10MB/s
    outbound: Math.round(Math.random() * 1024 * 1024 * 5) // 0-5MB/s
  };
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

export default router;
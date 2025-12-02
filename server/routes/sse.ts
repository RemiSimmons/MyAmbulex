import { Request, Response, Express } from 'express';
import { db } from '../db';
import { rides, notifications } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

// Store active SSE connections
const sseConnections = new Map<number, Response[]>();

export function setupSSERoutes(app: Express) {
  // SSE endpoint for real-time updates
  app.get('/api/sse/updates', (req: Request, res: Response) => {
    const userId = parseInt(req.query.userId as string);
    
    if (!userId || !req.user || req.user.id !== userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Store connection
    if (!sseConnections.has(userId)) {
      sseConnections.set(userId, []);
    }
    sseConnections.get(userId)!.push(res);

    console.log(`SSE: Client connected for user ${userId}`);

    // Send initial connection confirmation
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date() })}\n\n`);

    // Send periodic heartbeat
    const heartbeat = setInterval(() => {
      try {
        res.write(`data: ${JSON.stringify({ type: 'ping', timestamp: new Date() })}\n\n`);
      } catch (error) {
        clearInterval(heartbeat);
      }
    }, 30000); // 30 second heartbeat

    // Handle client disconnect
    req.on('close', () => {
      console.log(`SSE: Client disconnected for user ${userId}`);
      clearInterval(heartbeat);
      
      const connections = sseConnections.get(userId);
      if (connections) {
        const index = connections.indexOf(res);
        if (index !== -1) {
          connections.splice(index, 1);
        }
        if (connections.length === 0) {
          sseConnections.delete(userId);
        }
      }
    });
  });

  // Driver dashboard real-time updates
  app.get('/api/sse/driver-dashboard', (req: Request, res: Response) => {
    if (!req.user || req.user.role !== 'driver') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    const driverId = req.user.id;
    console.log(`SSE: Driver dashboard connected for driver ${driverId}`);

    // Send mock dashboard data initially
    const mockData = {
      type: 'dashboard_update',
      data: {
        activeDrivers: Math.floor(Math.random() * 50) + 20,
        pendingRides: Math.floor(Math.random() * 10) + 3,
        completedToday: Math.floor(Math.random() * 15) + 5,
        totalEarningsToday: Math.floor(Math.random() * 300) + 100,
        averageWaitTime: Math.floor(Math.random() * 15) + 5,
        systemStatus: 'operational'
      }
    };

    res.write(`data: ${JSON.stringify(mockData)}\n\n`);

    // Send periodic updates
    const updateInterval = setInterval(() => {
      try {
        const update = {
          type: 'live_metric_update',
          data: {
            activeDrivers: Math.floor(Math.random() * 50) + 20,
            pendingRides: Math.floor(Math.random() * 10) + 3,
            systemStatus: 'operational'
          }
        };
        res.write(`data: ${JSON.stringify(update)}\n\n`);
      } catch (error) {
        clearInterval(updateInterval);
      }
    }, 15000);

    req.on('close', () => {
      console.log(`SSE: Driver dashboard disconnected for driver ${driverId}`);
      clearInterval(updateInterval);
    });
  });
}

// Function to broadcast updates to specific users
export function broadcastToUser(userId: number, data: any) {
  const connections = sseConnections.get(userId);
  if (connections && connections.length > 0) {
    connections.forEach((res, index) => {
      try {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (error) {
        // Remove dead connection
        connections.splice(index, 1);
      }
    });
  }
}

// Function to broadcast ride updates to all relevant users
export function broadcastRideUpdate(rideId: number, oldStatus: string, newStatus: string, updatedBy: any) {
  const updateData = {
    type: 'ride_status_update',
    payload: {
      rideId,
      oldStatus,
      newStatus,
      updatedBy,
      timestamp: new Date()
    }
  };

  // Broadcast to all connected users (in a real app, you'd filter by relevance)
  sseConnections.forEach((connections, userId) => {
    broadcastToUser(userId, updateData);
  });
}

// Function to notify data refresh
export function notifyDataRefresh(userId: number) {
  broadcastToUser(userId, { type: 'data_refresh', timestamp: new Date() });
}
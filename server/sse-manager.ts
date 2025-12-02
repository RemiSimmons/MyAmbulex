import { Request, Response } from 'express';
import { EventEmitter } from 'events';

interface SSEClient {
  id: string;
  userId: number;
  response: Response;
  lastPing: Date;
  subscriptions: Set<string>;
}

interface SSEMessage {
  event: string;
  data: any;
  id?: string;
  retry?: number;
}

export class SSEManager extends EventEmitter {
  private clients: Map<string, SSEClient> = new Map();
  private userClients: Map<number, Set<string>> = new Map();
  private pingInterval: NodeJS.Timeout;

  constructor() {
    super();
    this.setupPingInterval();
    this.setupCleanup();
  }

  /**
   * Create a new SSE connection
   */
  createConnection(req: Request, res: Response, userId: number): string {
    const clientId = this.generateClientId();

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Send initial connection message
    this.sendToClient(res, {
      event: 'connected',
      data: { clientId, timestamp: new Date().toISOString() },
      id: clientId
    });

    // Create client record
    const client: SSEClient = {
      id: clientId,
      userId,
      response: res,
      lastPing: new Date(),
      subscriptions: new Set()
    };

    this.clients.set(clientId, client);

    // Track user connections
    if (!this.userClients.has(userId)) {
      this.userClients.set(userId, new Set());
    }
    this.userClients.get(userId)!.add(clientId);

    // Handle client disconnect
    res.on('close', () => {
      this.removeClient(clientId);
    });

    console.log(`SSE client connected: ${clientId} for user ${userId}`);
    return clientId;
  }

  /**
   * Subscribe client to specific channels
   */
  subscribe(clientId: string, channels: string[]): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    channels.forEach(channel => {
      client.subscriptions.add(channel);
    });

    console.log(`Client ${clientId} subscribed to channels:`, channels);
    return true;
  }

  /**
   * Unsubscribe client from specific channels
   */
  unsubscribe(clientId: string, channels: string[]): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    channels.forEach(channel => {
      client.subscriptions.delete(channel);
    });

    return true;
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientResponse: Response, message: SSEMessage): boolean {
    try {
      const formatted = this.formatSSEMessage(message);
      clientResponse.write(formatted);
      return true;
    } catch (error) {
      console.error('Error sending SSE message to client:', error);
      return false;
    }
  }

  /**
   * Send message to specific user (all their connections)
   */
  sendToUser(userId: number, message: SSEMessage): boolean {
    const userClientIds = this.userClients.get(userId);
    if (!userClientIds || userClientIds.size === 0) {
      console.log(`No SSE connections found for user ${userId}`);
      return false;
    }

    let sentCount = 0;
    userClientIds.forEach(clientId => {
      const client = this.clients.get(clientId);
      if (client) {
        if (this.sendToClient(client.response, message)) {
          sentCount++;
        }
      }
    });

    console.log(`Sent SSE message to ${sentCount}/${userClientIds.size} connections for user ${userId}`);
    return sentCount > 0;
  }

  /**
   * Broadcast message to all clients subscribed to a channel
   */
  broadcast(channel: string, message: SSEMessage): number {
    let sentCount = 0;
    
    this.clients.forEach(client => {
      if (client.subscriptions.has(channel)) {
        if (this.sendToClient(client.response, message)) {
          sentCount++;
        }
      }
    });

    console.log(`Broadcasted message to ${sentCount} clients on channel: ${channel}`);
    return sentCount;
  }

  /**
   * Send location update to ride participants
   */
  sendLocationUpdate(rideId: number, location: any): boolean {
    const message: SSEMessage = {
      event: 'location_update',
      data: {
        rideId,
        location,
        timestamp: new Date().toISOString()
      },
      id: `location_${rideId}_${Date.now()}`
    };

    return this.broadcast(`ride_${rideId}`, message) > 0;
  }

  /**
   * Send ride status update
   */
  sendRideStatusUpdate(rideId: number, status: string, data?: any): boolean {
    const message: SSEMessage = {
      event: 'ride_status_update',
      data: {
        rideId,
        status,
        ...data,
        timestamp: new Date().toISOString()
      },
      id: `status_${rideId}_${Date.now()}`
    };

    return this.broadcast(`ride_${rideId}`, message) > 0;
  }

  /**
   * Send notification to user
   */
  sendNotification(userId: number, notification: any): boolean {
    const message: SSEMessage = {
      event: 'notification',
      data: notification,
      id: `notification_${userId}_${Date.now()}`
    };

    return this.sendToUser(userId, message);
  }

  /**
   * Send alert to user
   */
  sendAlert(userId: number, alert: any): boolean {
    const message: SSEMessage = {
      event: 'alert',
      data: {
        ...alert,
        timestamp: new Date().toISOString()
      },
      id: `alert_${userId}_${Date.now()}`
    };

    return this.sendToUser(userId, message);
  }

  /**
   * Get connection stats
   */
  getStats(): { totalClients: number; userConnections: number; channels: string[] } {
    const channels = new Set<string>();
    this.clients.forEach(client => {
      client.subscriptions.forEach(channel => channels.add(channel));
    });

    return {
      totalClients: this.clients.size,
      userConnections: this.userClients.size,
      channels: Array.from(channels)
    };
  }

  /**
   * Remove client and cleanup
   */
  private removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from user connections
    const userClientIds = this.userClients.get(client.userId);
    if (userClientIds) {
      userClientIds.delete(clientId);
      if (userClientIds.size === 0) {
        this.userClients.delete(client.userId);
      }
    }

    // Remove client
    this.clients.delete(clientId);
    
    console.log(`SSE client disconnected: ${clientId}`);
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `sse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format message for SSE protocol
   */
  private formatSSEMessage(message: SSEMessage): string {
    let formatted = '';
    
    if (message.id) {
      formatted += `id: ${message.id}\n`;
    }
    
    if (message.event) {
      formatted += `event: ${message.event}\n`;
    }
    
    if (message.retry) {
      formatted += `retry: ${message.retry}\n`;
    }
    
    const dataStr = typeof message.data === 'string' 
      ? message.data 
      : JSON.stringify(message.data);
    
    formatted += `data: ${dataStr}\n\n`;
    
    return formatted;
  }

  /**
   * Setup periodic ping to keep connections alive
   */
  private setupPingInterval(): void {
    this.pingInterval = setInterval(() => {
      const now = new Date();
      
      this.clients.forEach((client, clientId) => {
        try {
          // Send ping
          this.sendToClient(client.response, {
            event: 'ping',
            data: { timestamp: now.toISOString() }
          });
          
          client.lastPing = now;
        } catch (error) {
          console.error(`Failed to ping client ${clientId}:`, error);
          this.removeClient(clientId);
        }
      });
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Setup periodic cleanup of stale connections
   */
  private setupCleanup(): void {
    setInterval(() => {
      const now = new Date();
      const staleThreshold = 5 * 60 * 1000; // 5 minutes
      
      const staleClients: string[] = [];
      
      this.clients.forEach((client, clientId) => {
        const timeSinceLastPing = now.getTime() - client.lastPing.getTime();
        if (timeSinceLastPing > staleThreshold) {
          staleClients.push(clientId);
        }
      });
      
      staleClients.forEach(clientId => {
        console.log(`Removing stale SSE client: ${clientId}`);
        this.removeClient(clientId);
      });
      
      if (staleClients.length > 0) {
        console.log(`Cleaned up ${staleClients.length} stale SSE connections`);
      }
    }, 60000); // Check every minute
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    // Close all connections
    this.clients.forEach(client => {
      try {
        client.response.end();
      } catch (error) {
        console.error('Error closing SSE connection:', error);
      }
    });
    
    this.clients.clear();
    this.userClients.clear();
  }
}

export const sseManager = new SSEManager();
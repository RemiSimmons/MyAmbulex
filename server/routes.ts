import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupSSERoutes } from "./routes/sse";
import { registerRoutes, configureUploadsMiddleware } from "./routes/index";

// Type definitions for WebSocket messages (keeping existing types)
export interface DriverLocation {
  lat: number;
  lng: number;
  timestamp: Date;
}

export interface LocationUpdate {
  type: 'location_update';
  driverId: number;
  rideId: number;
  location: DriverLocation;
}

export interface TrackingMessage {
  type: 'start_tracking' | 'stop_tracking';
  role: 'driver' | 'rider';
  userId: number;
  rideId: number;
}

export interface RideStatusUpdate {
  type: 'ride_status_update';
  rideId: number;
  oldStatus: string;
  newStatus: string;
  updatedBy: {
    id: number;
    username: string;
    role: string;
  };
  timestamp: Date;
}

export interface BidUpdate {
  type: 'bid_update';
  bidId: number;
  rideId: number;
  status: string;
  amount: number;
  fromUserId: number;
  toUserId: number;
  timestamp: Date;
}

export interface NotificationMessage {
  type: 'notification';
  notificationId: string;
  userId: number;
  title: string;
  message: string;
  notificationType: string;
  read: boolean;
  timestamp: Date;
  link?: string;
}

export interface ChatMessage {
  type: 'chat_message';
  messageId: number;
  conversationId: number;
  senderId: number;
  content: string;
  timestamp: Date;
  attachmentUrl?: string;
  attachmentType?: string;
  isSystemMessage?: boolean;
}

export interface TypingIndicator {
  type: 'typing_indicator';
  conversationId: number;
  userId: number;
  isTyping: boolean;
  timestamp: Date;
}

export interface ReadReceipt {
  type: 'read_receipt';
  conversationId: number;
  userId: number;
  lastReadMessageId: number;
  timestamp: Date;
}

export type WebSocketMessage = LocationUpdate | TrackingMessage | RideStatusUpdate | BidUpdate | NotificationMessage | ChatMessage | TypingIndicator | ReadReceipt;

// Maps to track active connections (keeping existing functionality)
export const rideConnections = new Map<number, Set<WebSocket>>();
export const userConnections = new Map<number, WebSocket>();

export function setupRoutes(app: Express): Server {
  const server = createServer(app);
  
  // Setup authentication first
  setupAuth(app);
  
  // Configure uploads middleware
  configureUploadsMiddleware(app);
  
  // Register all modular routes
  registerRoutes(app);
  
  // Setup SSE routes for real-time communication
  setupSSERoutes(app);
  
  return server;
}

export default setupRoutes;
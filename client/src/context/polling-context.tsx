
import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useRef, 
  useState, 
  ReactNode, 
  useCallback
} from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type MessageHandler = (data: any) => void;

export type RideStatusUpdate = {
  rideId: number;
  oldStatus: string;
  newStatus: string;
  updatedBy: {
    id: number;
    username: string;
    role: string;
  };
  timestamp: Date;
  driverInfo?: {
    name: string;
    phone?: string;
    vehicleInfo?: string;
  };
};

interface PollingContextType {
  connected: boolean;
  registerHandler: (type: string, handler: MessageHandler) => void;
  unregisterHandler: (type: string) => void;
  sendMessage: (message: any) => void;
  startTrackingRide: (rideId: number) => void;
  stopTrackingRide: (rideId: number) => void;
  latestStatusUpdate: RideStatusUpdate | null;
  clearStatusUpdate: () => void;
  socket: null; // Compatibility - always null in polling mode
  subscribe: (type: string, handler: MessageHandler) => void;
  unsubscribe: (type: string, handler: MessageHandler) => void;
  fallbackMode: boolean;
  pollForUpdates: () => Promise<void>;
}

const PollingContext = createContext<PollingContextType | null>(null);

export function PollingProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(true); // Always "connected" in polling mode
  const [messageHandlers] = useState<Record<string, MessageHandler>>({});
  const [latestStatusUpdate, setLatestStatusUpdate] = useState<RideStatusUpdate | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Track rides being monitored
  const trackedRidesRef = useRef<Set<number>>(new Set());
  const pollIntervalRef = useRef<number | null>(null);
  const lastPollDataRef = useRef<any>({});

  // Polling function to check for updates
  const pollForUpdates = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch current data
      const [ridesResponse, notificationsResponse] = await Promise.all([
        fetch('/api/rides', { credentials: 'include' }),
        fetch('/api/notifications', { credentials: 'include' })
      ]);

      if (ridesResponse.ok && notificationsResponse.ok) {
        const [ridesData, notificationsData] = await Promise.all([
          ridesResponse.json(),
          notificationsResponse.json()
        ]);

        // Check for ride status changes
        if (lastPollDataRef.current.rides) {
          const oldRides = lastPollDataRef.current.rides;
          const newRides = ridesData;

          // Find status changes
          for (const newRide of newRides) {
            const oldRide = oldRides.find((r: any) => r.id === newRide.id);
            if (oldRide && oldRide.status !== newRide.status) {
              // Status changed - simulate WebSocket message
              const statusUpdate: RideStatusUpdate = {
                rideId: newRide.id,
                oldStatus: oldRide.status,
                newStatus: newRide.status,
                updatedBy: {
                  id: newRide.driverId || newRide.riderId,
                  username: newRide.driverName || newRide.riderName || 'System',
                  role: newRide.driverId ? 'driver' : 'rider'
                },
                timestamp: new Date(),
                driverInfo: newRide.driverInfo
              };

              // Show notification
              const statusMessages: Record<string, string> = {
                en_route: "Your driver is now on the way to pick you up!",
                arrived: "Your driver has arrived at the pickup location.",
                in_progress: "Your ride is now in progress. Enjoy your journey!",
                completed: "Your ride has been completed. Thank you for using MyAmbulex!",
                cancelled: "Your ride has been cancelled.",
                scheduled: "Your ride has been scheduled and a driver has been assigned!"
              };

              toast({
                title: "Ride Status Updated",
                description: statusMessages[newRide.status] || `Status changed to ${newRide.status}`,
                duration: 5000,
              });

              // Store for notifications if this affects the current user
              if (user.role === 'rider' && 
                  ['en_route', 'arrived', 'completed', 'scheduled'].includes(newRide.status)) {
                setLatestStatusUpdate(statusUpdate);
              }
            }
          }
        }

        // Check for new notifications
        if (lastPollDataRef.current.notifications) {
          const oldNotifications = lastPollDataRef.current.notifications;
          const newNotifications = notificationsData;

          const newCount = newNotifications.length - oldNotifications.length;
          if (newCount > 0) {
            // New notifications received
            const latestNotification = newNotifications[0];
            if (latestNotification && latestNotification.type !== 'SYSTEM') {
              toast({
                title: "New Notification",
                description: latestNotification.message || "You have a new notification",
                duration: 4000,
              });
            }
          }
        }

        // Store current data for next comparison
        lastPollDataRef.current = {
          rides: ridesData,
          notifications: notificationsData
        };

        // Invalidate queries to refresh UI - but NOT individual bid queries to prevent infinite loops
        queryClient.invalidateQueries({ 
          queryKey: ['/api/rides'],
          exact: true // Only invalidate exact matches
        });
        queryClient.invalidateQueries({ 
          queryKey: ['/api/notifications'],
          exact: true 
        });
        queryClient.invalidateQueries({ 
          queryKey: ['/api/rider/rides'],
          exact: true 
        });
        queryClient.invalidateQueries({ 
          queryKey: ['/api/driver/rides'],
          exact: true 
        });

        console.log('Polling: Updated all data queries');
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, [user, queryClient, toast]);

  // Set up polling interval with Server-Sent Events fallback
  useEffect(() => {
    if (!user) return;

    console.log('Starting enhanced polling service for user:', user.username);
    
    // Try Server-Sent Events first for better real-time performance
    let eventSource: EventSource | null = null;
    let sseConnected = false;

    const setupSSE = () => {
      try {
        eventSource = new EventSource(`/api/sse/updates?userId=${user.id}`);
        
        eventSource.onopen = () => {
          sseConnected = true;
          console.log('SSE connection established - using real-time updates');
        };
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'ping') return; // Ignore heartbeat
            
            // Handle different update types
            switch (data.type) {
              case 'ride_status_update':
                setLatestStatusUpdate(data.payload);
                break;
              case 'new_notification':
                toast({
                  title: "New Notification",
                  description: data.payload.message,
                  duration: 4000,
                });
                break;
              case 'data_refresh':
                queryClient.invalidateQueries({ queryKey: ['/api/rides'] });
                queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
                break;
            }
          } catch (error) {
            console.error('Error parsing SSE data:', error);
          }
        };
        
        eventSource.onerror = () => {
          console.log('SSE connection failed, falling back to polling');
          sseConnected = false;
          eventSource?.close();
          eventSource = null;
        };
      } catch (error) {
        console.log('SSE not supported or failed, using polling mode');
      }
    };

    // Attempt SSE connection
    setupSSE();
    
    // Initial poll
    pollForUpdates();

    // Set up polling as fallback (or primary if SSE fails)
    const pollInterval = window.setInterval(() => {
      if (!sseConnected) {
        pollForUpdates();
      }
    }, 60000); // 60 seconds - much more reasonable for fallback polling

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      console.log('Stopped polling/SSE service');
    };
  }, [user, pollForUpdates, queryClient, toast]);

  // Compatibility functions for WebSocket interface
  const registerHandler = useCallback((type: string, handler: MessageHandler) => {
    // Not needed in polling mode, but kept for compatibility
  }, []);

  const unregisterHandler = useCallback((type: string) => {
    // Not needed in polling mode, but kept for compatibility
  }, []);

  const sendMessage = useCallback((message: any) => {
    // In polling mode, we handle actions through regular API calls
    console.log('Polling mode: Message would be sent via API:', message);
  }, []);

  const startTrackingRide = useCallback((rideId: number) => {
    trackedRidesRef.current.add(rideId);
    console.log(`Polling: Started tracking ride ${rideId}`);
  }, []);

  const stopTrackingRide = useCallback((rideId: number) => {
    trackedRidesRef.current.delete(rideId);
    console.log(`Polling: Stopped tracking ride ${rideId}`);
  }, []);

  const clearStatusUpdate = useCallback(() => {
    setLatestStatusUpdate(null);
  }, []);

  const subscribe = useCallback((type: string, handler: MessageHandler) => {
    // Not needed in polling mode, but kept for compatibility
  }, []);

  const unsubscribe = useCallback((type: string, handler: MessageHandler) => {
    // Not needed in polling mode, but kept for compatibility
  }, []);

  const contextValue: PollingContextType = {
    connected: true, // Always connected in polling mode
    registerHandler,
    unregisterHandler,
    sendMessage,
    startTrackingRide,
    stopTrackingRide,
    latestStatusUpdate,
    clearStatusUpdate,
    socket: null, // No socket in polling mode
    subscribe,
    unsubscribe,
    fallbackMode: true, // Always in "fallback" mode
    pollForUpdates
  };

  return (
    <PollingContext.Provider value={contextValue}>
      {children}
    </PollingContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(PollingContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a PollingProvider');
  }
  return context;
}

// Export with new name for clarity
export const usePolling = useWebSocket;

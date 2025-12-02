import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useRef, 
  useState, 
  ReactNode, 
  useCallback,
  useMemo
} from "react";
import { useAuth, useLogoutWebsocket, LOGOUT_EVENT } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "./session-context";

type MessageHandler = (data: any) => void;

// Types for status notifications
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

interface WebSocketContextType {
  connected: boolean;
  registerHandler: (type: string, handler: MessageHandler) => void;
  unregisterHandler: (type: string) => void;
  sendMessage: (message: any) => void;
  startTrackingRide: (rideId: number) => void;
  stopTrackingRide: (rideId: number) => void;
  // Add latest status update tracking for notifications
  latestStatusUpdate: RideStatusUpdate | null;
  clearStatusUpdate: () => void;
  // Add methods for subscribing to message types
  socket: WebSocket | null;
  subscribe: (type: string, handler: MessageHandler) => void;
  unsubscribe: (type: string, handler: MessageHandler) => void;
  // Flag to indicate fallback mode (using polling instead of websockets)
  fallbackMode?: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  // Use the shared WebSocket reference from our logout handler
  const socketRef = useLogoutWebsocket();
  const reconnectTimeoutRef = useRef<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [messageHandlers, setMessageHandlers] = useState<Record<string, MessageHandler>>({});
  const [latestStatusUpdate, setLatestStatusUpdate] = useState<RideStatusUpdate | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [fallbackMode, setFallbackMode] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { handleSessionExpired } = useSession();

  // Track the rides that are currently being tracked to resubscribe after reconnection
  const trackedRidesRef = useRef<Set<number>>(new Set());

  // Constants for WebSocket management - very conservative for Replit
  const MAX_RECONNECT_ATTEMPTS = 2;       // Further reduced for Replit limits
  const BASE_DELAY = 10000;               // Increased to 10 seconds for Replit
  const MAX_DELAY = 60000;                // Increased to 60 seconds max
  const HEALTH_CHECK_INTERVAL = 120000;   // Reduced frequency to 120 seconds
  const JITTER_FACTOR = 0.3;              // Increased jitter to spread load

  // Track if we've shown the "connection lost" toast to avoid multiple toasts
  const hasShownConnectionLostToast = useRef(false);
  // Track if we are in the reconnecting state
  const isReconnectingRef = useRef(false);
  // Track if there's a connection attempt in progress
  const connectionInProgressRef = useRef(false);

  // Check if we should skip WebSocket connections entirely (Replit environment)
  const shouldSkipWebSocket = useMemo(() => {
    const hostname = window.location.hostname;
    const isReplit = hostname.includes('replit.dev') || 
                     hostname.includes('replit.com') || 
                     hostname.includes('replit.app') ||
                     hostname.includes('repl.co');
    const hasReplitPattern = hostname.match(/^[a-f0-9-]+-[a-f0-9-]+-.*\.replit\.dev$/);

    if (isReplit || hasReplitPattern) {
      console.log('Replit environment detected - WebSocket connections disabled due to platform restrictions');
      return true;
    }
    return false;
  }, []);

  // Start in fallback mode immediately if we're on Replit
  useEffect(() => {
    if (shouldSkipWebSocket) {
      console.log('Activating fallback mode immediately due to Replit network policies');
      setFallbackMode(true);

      // Show informational toast about Replit limitations
      if (!hasShownConnectionLostToast.current) {
        hasShownConnectionLostToast.current = true;
        toast({
          title: "Platform Mode",
          description: "Running in polling mode due to Replit network restrictions. All features work normally.",
          duration: 3000
        });
      }
    }
  }, [shouldSkipWebSocket, toast]);

  // Function to establish the WebSocket connection with improved reconnection handling
  const connectWebSocket = useCallback(() => {
    // Skip WebSocket entirely on Replit due to platform network restrictions
    if (shouldSkipWebSocket) {
      console.log('WebSocket disabled on Replit - using polling mode instead');
      setFallbackMode(true);
      return;
    }

    // Don't connect if no user
    if (!user) {
      console.log("No user, not attempting WebSocket connection");
      return;
    }

    // Only try to connect if we're not already connected
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      console.log("WebSocket already connected");
      return;
    }

    // Get session ID from cookie with improved retry logic and URL decoding
    const allCookies = document.cookie ? document.cookie.split(';').map(c => c.trim()) : [];

    // Try multiple cookie name patterns
    let sessionIdParam = null;
    for (const cookie of allCookies) {
      if (cookie.startsWith('myambulex.sid=')) {
        sessionIdParam = cookie.split('=')[1];
        break;
      } else if (cookie.startsWith('connect.sid=')) {
        sessionIdParam = cookie.split('=')[1];
        break;
      } else if (cookie.includes('.sid=')) {
        // Catch any other session ID patterns
        sessionIdParam = cookie.split('=')[1];
        break;
      }
    }

    // If still no session ID found, try parsing the raw cookie string differently
    if (!sessionIdParam && document.cookie) {
      const cookieMatch = document.cookie.match(/(?:myambulex\.sid|connect\.sid)=([^;]+)/);
      if (cookieMatch) {
        sessionIdParam = cookieMatch[1];
      }
    }

    // Decode URL-encoded session cookies
    if (sessionIdParam) {
      try {
        // Handle URL encoding (s%3A becomes s:)
        sessionIdParam = decodeURIComponent(sessionIdParam);
        console.log("Decoded session cookie:", {
          original: sessionIdParam.substring(0, 20) + '...',
          wasEncoded: sessionIdParam !== decodeURIComponent(sessionIdParam)
        });
      } catch (decodeError) {
        console.warn("Failed to decode session cookie, using as-is:", decodeError);
      }
    }

    console.log("WebSocket: Session check:", {
      hasCookie: !!sessionIdParam,
      cookiePrefix: sessionIdParam ? sessionIdParam.substring(0, 8) + '...' : null,
      allCookies: allCookies.map(c => c.split('=')[0]),
      rawCookieString: document.cookie ? document.cookie.substring(0, 100) + '...' : 'No cookies'
    });

    if (!sessionIdParam) {
      // Limit retry attempts to prevent infinite session waiting
      const maxRetries = 3; // Reduced max retries
      const retryKey = 'websocket_session_retries';
      const currentRetries = parseInt(sessionStorage.getItem(retryKey) || '0');

      if (currentRetries >= maxRetries) {
        console.warn("WebSocket: Max session retry attempts reached, activating fallback mode");
        setFallbackMode(true);
        sessionStorage.removeItem(retryKey);
        return;
      }

      sessionStorage.setItem(retryKey, (currentRetries + 1).toString());
      console.log(`WebSocket: Waiting for session (attempt ${currentRetries + 1}/${maxRetries})...`);

      // Check if user is actually logged in before retrying
      if (!user) {
        console.log("WebSocket: No user detected, not retrying session lookup");
        sessionStorage.removeItem(retryKey);
        return;
      }

      setTimeout(connectWebSocket, 3000); // Reduced delay
      return;
    }

    // Clear retry counter on successful session detection
    sessionStorage.removeItem('websocket_session_retries');
    console.log("WebSocket: Session ID found, proceeding with connection");

    const sessionId = sessionIdParam;

    // Clear any existing timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Don't try to connect if we're actively in the process of reconnecting
    if (isReconnectingRef.current || connectionInProgressRef.current) {
      console.log("Connection attempt in progress, waiting...");
      return;
    }

    // Mark that a connection attempt is in progress
    connectionInProgressRef.current = true;

    // Check for excessive reconnect attempts with a lower limit


    // Validate user is logged in
    if (!user) {
      console.log("No user, not connecting WebSocket");
      return;
    }

    // Check if we're in the process of logging out - don't connect in that case
    const isLoggingOut = document.cookie.indexOf('logging_out=true') !== -1;
    if (isLoggingOut) {
      console.log("Detected logout in progress, aborting WebSocket connection");
      return;
    }

    // Close existing socket if any
    if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
      console.log("Closing existing socket before creating a new one");
      socketRef.current.close();
      socketRef.current = null;
    }

    // Mark that we're starting a connection attempt
    isReconnectingRef.current = true;

    // Create new socket with session cookie support
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    // Use the same session ID we found earlier
    if (!sessionIdParam) {
      console.warn('No session ID available, delaying WebSocket connection');
      connectionInProgressRef.current = false;
      setTimeout(() => connectWebSocket(), 1000);
      return;
    }

    const wsUrlWithSession = `${wsUrl}?sessionId=${encodeURIComponent(sessionIdParam)}`;

    console.log("WebSocket: Connecting with session ID:", {
      url: wsUrl,
      sessionIdPrefix: sessionIdParam.substring(0, 8) + '...',
      fullUrl: wsUrlWithSession.split('?')[0] + '?sessionId=' + sessionIdParam.substring(0, 8) + '...'
    });

    // Create WebSocket connection with session ID in URL
    const newSocket = new WebSocket(wsUrlWithSession);

    // Add connection timeout optimized for Replit
    const connectionTimeout = setTimeout(() => {
      if (newSocket.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket connection timeout - Replit may be limiting connections');
        newSocket.close();
      }
    }, 10000); // Increased timeout for Replit environment

    // Set a connection timeout - if we can't connect within 10 seconds, trigger reconnect
    const connectionTimeoutId = setTimeout(() => {
      if (newSocket.readyState !== WebSocket.OPEN) {
        console.warn("WebSocket connection timed out");
        newSocket.close(); // This will trigger the onclose handler
      }
    }, 10000);

    newSocket.onopen = () => {
      // Clear the connection timeout
      clearTimeout(connectionTimeoutId);
      clearTimeout(connectionTimeout);

      console.log("WebSocket: Connected successfully to", wsUrlWithSession.split('?')[0]);
      setConnected(true);
      setReconnectCount(0);
      isReconnectingRef.current = false;
      connectionInProgressRef.current = false;
      hasShownConnectionLostToast.current = false;
      setFallbackMode(false); // Clear fallback mode on successful connection

      // Resubscribe to all previously tracked rides
      trackedRidesRef.current.forEach(rideId => {
        if (user) {
          newSocket.send(JSON.stringify({
            type: 'start_tracking',
            role: user.role,
            userId: user.id,
            rideId
          }));
          console.log(`WebSocket: Resubscribed to tracking for ride ${rideId}`);
        }
      });
    };

    newSocket.onclose = (event) => {
      // Clear the connection timeout if it's still running
      clearTimeout(connectionTimeoutId);

      // Reset connection flags
      isReconnectingRef.current = false;
      connectionInProgressRef.current = false;

      console.log(`WebSocket disconnected, code: ${event.code}, reason: ${event.reason || "No reason specified"}`);
      setConnected(false);

      // Don't attempt to reconnect in these cases:
      // 1. Clean closure (code 1000) during normal operation
      // 2. We're at the maximum retry count
      // 3. User initiated logout or navigation away (code 1001)
      const isUserInitiatedClose = event.code === 1000 || event.code === 1001;
      const isLoggingOut = document.cookie.indexOf('logging_out=true') !== -1;

      // Handle abnormal closures (code 1006) slightly differently
      const isAbnormalClosure = event.code === 1006;

      if (isUserInitiatedClose || reconnectCount >= MAX_RECONNECT_ATTEMPTS || isLoggingOut) {
        console.log("Not attempting to reconnect: clean close, logout, or max retries reached");
        return;
      }

      // If we've had more than 1 consecutive abnormal closures, activate fallback mode
      // Replit has very strict limits, so we fallback immediately
      if (isAbnormalClosure && reconnectCount >= 1) {
        console.log("Abnormal closure detected (Replit limits), activating fallback mode immediately");
        setFallbackMode(true);

        if (!hasShownConnectionLostToast.current) {
          hasShownConnectionLostToast.current = true;
          toast({
            title: "Limited Connectivity Mode",
            description: "Due to platform limitations, using polling for updates. Real-time features are temporarily limited.",
            duration: 8000
          });
        }
        return;
      }

      // Calculate backoff with exponential growth and jitter to prevent all clients from
      // reconnecting at exactly the same time (thundering herd problem)
      const exponentialDelay = Math.min(
        BASE_DELAY * Math.pow(1.5, reconnectCount), 
        MAX_DELAY
      );

      // Add jitter - random variation of ±10% to spread reconnects
      const jitter = exponentialDelay * JITTER_FACTOR * (Math.random() * 2 - 1);
      const finalDelay = Math.floor(exponentialDelay + jitter);

      console.log(`Scheduling reconnect attempt in ${finalDelay}ms (attempt ${reconnectCount + 1})`);

      // Clear any existing timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Set the reconnect timeout
      reconnectTimeoutRef.current = window.setTimeout(() => {
        // Check again if we should attempt to reconnect (things may have changed)
        const isLoggingOut = document.cookie.indexOf('logging_out=true') !== -1;

        if (isLoggingOut || connectionInProgressRef.current) {
          console.log("Skipping scheduled reconnect - logout in progress or connection already active");
          return;
        }

        // Increment the counter BEFORE attempting reconnect
        setReconnectCount(prev => prev + 1);
        connectWebSocket();
      }, finalDelay);
    };

    newSocket.onerror = (error) => {
      console.error("WebSocket: Connection error:", {
        error: error,
        readyState: newSocket.readyState,
        url: wsUrlWithSession.split('?')[0],
        hasSession: !!sessionIdParam
      });
      setConnected(false);
      // Error handling is done in onclose
    };

    newSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Skip verbose logging for heartbeats or high-frequency updates
        if (data.type !== 'heartbeat') {
          console.log("WebSocket message received:", data);
        }

        // Handle message based on type
        if (data.type && messageHandlers[data.type]) {
          messageHandlers[data.type](data);
        } 

        // Check for authentication errors
        if (data.type === 'error' && data.code === 401) {
          console.error("WebSocket authentication error, user session may have expired");
          handleSessionExpired();
          return;
        }

        // Handle server-initiated session updates
        if (data.type === 'session_update_needed' && data.newSessionId) {
          console.log("WebSocket: Server requested session update to:", data.newSessionId.substring(0, 8) + '...');

          // Update the session cookie
          const newSessionCookie = `myambulex.sid=${encodeURIComponent('s:' + data.newSessionId + '.signature')}; path=/; SameSite=Lax`;
          document.cookie = newSessionCookie;

          // Show a notification
          toast({
            title: "Connection Improved",
            description: data.message || "Your connection has been optimized for better performance.",
            duration: 3000,
          });

          console.log("WebSocket: Session cookie updated, connection should improve");
        }

        // Special handlers for specific messages
        switch (data.type) {
          case 'ride_status_update':
            // Invalidate ALL ride-related queries to ensure dashboard refreshes properly
            queryClient.invalidateQueries({ queryKey: ['/api/rides'] });

            if (data.rideId) {
              queryClient.invalidateQueries({ queryKey: ['/api/rides', data.rideId] });
            }

            queryClient.invalidateQueries({ queryKey: ['/api/ride-requests'] });
            queryClient.invalidateQueries({ queryKey: ['/api/rider/rides'] });

            // Also refresh bids since accepting a bid changes ride status
            if (data.oldStatus === "bidding" && data.newStatus === "scheduled") {
              queryClient.invalidateQueries({ queryKey: ['/api/bids/ride'] });
              queryClient.invalidateQueries({ queryKey: ['/api/driver/bids'] });
            }

            // Enhanced and more user-friendly status update messages
            const statusMessages: Record<string, string> = {
              en_route: "Your driver is now on the way to pick you up!",
              arrived: "Your driver has arrived at the pickup location.",
              in_progress: "Your ride is now in progress. Enjoy your journey!",
              completed: "Your ride has been completed. Thank you for using MyAmbulex!",
              cancelled: "Your ride has been cancelled.",
              scheduled: "Your ride has been scheduled and a driver has been assigned!"
            };

            // Show a toast notification with more specific details
            toast({
              title: `Ride Status Updated`,
              description: statusMessages[data.newStatus] || `Status changed from ${data.oldStatus} to ${data.newStatus}`,
              duration: 5000,
            });

            // For rider-specific important status changes, store the update to trigger a popup
            if (
              user?.role === 'rider' && 
              ['en_route', 'arrived', 'completed', 'scheduled'].includes(data.newStatus) &&
              data.updatedBy?.role === 'driver'
            ) {
              // Find driver info if available
              const driverInfo = data.driverInfo || {
                name: data.updatedBy?.username || 'Your driver',
                phone: data.driverPhone,
                vehicleInfo: data.vehicleInfo
              };

              // Store the status update to show in the appropriate component
              setLatestStatusUpdate({
                ...data,
                driverInfo
              });

              console.log(`Set latest status update: ${data.newStatus} by ${driverInfo.name}`);
            }
            break;

          case 'bid_update':
            console.log("Processing bid update:", data);

            // Invalidate ALL related queries to ensure dashboard refreshes
            queryClient.invalidateQueries({ queryKey: ['/api/rides'] });

            if (data.rideId) {
              queryClient.invalidateQueries({ queryKey: ['/api/bids/ride', data.rideId] });
            }

            queryClient.invalidateQueries({ queryKey: ['/api/driver/bids'] });

            // When a bid is accepted, make sure we also refresh the active requests
            if (data.status === 'accepted') {
              console.log("Bid was accepted, invalidating all ride-related queries");
              queryClient.invalidateQueries({ queryKey: ['/api/ride-requests'] });
              queryClient.invalidateQueries({ queryKey: ['/api/rider/rides'] });
            }

            // Enhanced bid update messages with more context
            const bidStatusMessages: Record<string, string> = {
              submitted: `A new bid of $${data.amount?.toFixed(2)} has been submitted for your ride`,
              accepted: `Your bid of $${data.amount?.toFixed(2)} has been accepted!`,
              rejected: `A bid of $${data.amount?.toFixed(2)} was rejected`,
              countered: `You've received a counter-offer of $${data.amount?.toFixed(2)}`,
              cancelled: `A bid of $${data.amount?.toFixed(2)} was cancelled`
            };

            if (data.amount != null) {
              toast({
                title: 'Bid Update',
                description: bidStatusMessages[data.status] || `A bid has been ${data.status} for $${data.amount.toFixed(2)}`,
                duration: 5000,
              });
            }
            break;

          case 'notification':
            // Invalidate notifications
            queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });

            toast({
              title: data.title || 'Notification',
              description: data.message || 'You have a new notification',
              duration: 5000,
            });
            break;

          default:
            // Handle other message types (nothing to do for unknown types)
            break;
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    };

    socketRef.current = newSocket;
  }, [user, toast, queryClient, reconnectCount, handleSessionExpired, shouldSkipWebSocket]);

  // Effect to set up the WebSocket connection when the user is available
  useEffect(() => {
    // Define the cleanup function to ensure consistent handling
    const cleanupWebSocketResources = (reason: string) => {
      // Close the socket with a clean closure if it exists
      if (socketRef.current) {
        console.log(`Cleaning up WebSocket resources: ${reason}`);
        if (socketRef.current.readyState === WebSocket.CONNECTING || 
            socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.close(1000, reason);
        }
        socketRef.current = null;
        setConnected(false);
      }

      // Reset reconnect count
      setReconnectCount(0);

      // Clear any pending reconnect timeouts
      if (reconnectTimeoutRef.current) {
        console.log(`Clearing reconnect timeout: ${reason}`);
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Clear tracked rides
      trackedRidesRef.current.clear();

      // Reset flags
      isReconnectingRef.current = false;
      hasShownConnectionLostToast.current = false;
    };

    // WebSocket completely disabled - using polling system
    console.log('WebSocket disabled - using polling mode for all environments');
    setFallbackMode(true);
    setConnected(false);

    // Clean up any resources
    cleanupWebSocketResources("WebSocket functionality disabled");

    // Handler for explicit logout events
    const handleLogoutEvent = () => {
      console.log("Logout event detected in WebSocket context");

      // Stop any reconnection attempts immediately by setting count beyond limit
      setReconnectCount(MAX_RECONNECT_ATTEMPTS + 1);

      // Clean up all WebSocket resources
      cleanupWebSocketResources("User logout");
    };

    // Add event listener for logout
    window.addEventListener(LOGOUT_EVENT, handleLogoutEvent);

    // Ping interval to keep the connection alive (reduced frequency)
    let pingIntervalId: number | null = null;
    if (user && socketRef.current) {
      pingIntervalId = window.setInterval(() => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          // Send a lightweight ping message
          try {
            socketRef.current.send(JSON.stringify({ type: 'ping' }));
          } catch (e) {
            console.warn('Error sending ping:', e);
          }
        }
      }, 60000); // Increased to 60 seconds to reduce session lookups
    }

    // Enhanced session renewal handler with better session detection
    const handleSessionRenewal = (event: CustomEvent) => {
      const eventDetail = event.detail || {};
      const newSessionId = eventDetail.newSessionId;
      const forceReconnect = eventDetail.forceReconnect;

      console.log("WebSocket: Session renewal event received:", {
        hasNewSessionId: !!newSessionId,
        newSessionPrefix: newSessionId ? newSessionId.substring(0, 15) + '...' : 'No session provided',
        forceReconnect: forceReconnect,
        currentConnectionState: socketRef.current?.readyState
      });

      // Close existing connection if any
      if (socketRef.current) {
        const currentState = socketRef.current.readyState;
        console.log("WebSocket: Closing existing connection for session renewal, current state:", currentState);

        try {
          if (currentState === WebSocket.OPEN || currentState === WebSocket.CONNECTING) {
            socketRef.current.close(1000, "Session renewed");
          }
        } catch (closeError) {
          console.warn("Error closing existing WebSocket:", closeError);
        }

        socketRef.current = null;
      }

      // Clear any pending reconnection attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Reset flags and counters
      setReconnectCount(0);
      setConnected(false);
      isReconnectingRef.current = false;
      connectionInProgressRef.current = false;

      // Function to attempt connection with session validation
      const attemptReconnectionWithSession = () => {
        // Always get the latest session from cookies
        const currentSessionCookie = document.cookie
          .split(';')
          .find(row => row.trim().startsWith('myambulex.sid='))
          ?.split('=')[1];

        console.log("WebSocket: Session validation for reconnection:", {
          hasSessionInCookie: !!currentSessionCookie,
          cookieSessionPrefix: currentSessionCookie ? currentSessionCookie.substring(0, 8) + '...' : 'Not found',
          providedSessionPrefix: newSessionId ? newSessionId.substring(0, 8) + '...' : 'Not provided',
          willUseProvidedSession: !!newSessionId,
          allCookies: document.cookie.split(';').map(c => c.trim().split('=')[0])
        });

        if (newSessionId || currentSessionCookie) {
          console.log("WebSocket: Valid session found, attempting reconnection");
          connectWebSocket();
        } else {
          console.warn("WebSocket: No valid session found after renewal event");
          // Retry after a short delay in case session cookie is still being set
          setTimeout(() => {
            const retrySessionCookie = document.cookie
              .split(';')
              .find(row => row.trim().startsWith('myambulex.sid='))
              ?.split('=')[1];

            if (retrySessionCookie) {
              console.log("WebSocket: Session found on retry, connecting");
              connectWebSocket();
            } else {
              console.error("WebSocket: Still no session after retry, giving up");
            }
          }, 1000);
        }
      };

      // Delay to ensure session cookies are fully updated by browser
      const reconnectionDelay = forceReconnect ? 500 : 200;

      setTimeout(() => {
        console.log("WebSocket: Attempting reconnection with renewed session after delay");
        attemptReconnectionWithSession();
      }, reconnectionDelay);
    };

    window.addEventListener('session-renewed', handleSessionRenewal as EventListener);

    // Cleanup function for component unmount, user change, or dependency changes
    return () => {
      // Remove event listener
      window.removeEventListener(LOGOUT_EVENT, handleLogoutEvent);

      // Remove session renewal listener
      window.removeEventListener('session-renewed', handleSessionRenewal as EventListener);

      // Clear ping interval if it exists
      if (pingIntervalId !== null) {
        clearInterval(pingIntervalId);
      }

      // Clean up all WebSocket resources
      cleanupWebSocketResources("Component cleanup");
    };
  }, [user, connectWebSocket, MAX_RECONNECT_ATTEMPTS, shouldSkipWebSocket, toast]);

  // Set up polling in fallback mode to regularly check for updates
  useEffect(() => {
    let pollInterval: number | null = null;

    if (fallbackMode && user) {
      console.log("Setting up fallback mode polling for updates", { trackedRides: Array.from(trackedRidesRef.current) });

      // Function to poll for updates
      const pollForUpdates = async () => {
        try {
          // Poll for notifications as a fallback for real-time updates
          queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });

          // Also poll for ride updates if tracking rides
          if (trackedRidesRef.current.size > 0) {
            trackedRidesRef.current.forEach(rideId => {
              queryClient.invalidateQueries({ queryKey: ['/api/rides', rideId] });
            });

            // Refresh active/upcoming rides too
            queryClient.invalidateQueries({ queryKey: ['/api/rider/rides'] });
            queryClient.invalidateQueries({ queryKey: ['/api/driver/rides'] });
          }

          // Poll for chat messages if needed
          queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
        } catch (error) {
          console.error("Error during fallback polling:", error);
        }
      };

      // Poll immediately and then set interval with much longer delay for Replit
      pollForUpdates();
      pollInterval = window.setInterval(pollForUpdates, 60000); // Poll every 60 seconds (very reduced frequency for Replit)
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [fallbackMode, user, queryClient]);

  // Memoized handler registration
  const registerHandler = useCallback((type: string, handler: MessageHandler) => {
    setMessageHandlers(prev => ({
      ...prev,
      [type]: handler
    }));
  }, []);

  // Memoized handler unregistration
  const unregisterHandler = useCallback((type: string) => {
    setMessageHandlers(prev => {
      const newHandlers = { ...prev };
      delete newHandlers[type];
      return newHandlers;
    });
  }, []);

  // Memoized message sending
  const sendMessage = useCallback((message: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not connected, can't send message");
    }
  }, []);

  // Memoized ride tracking functions
  const startTrackingRide = useCallback((rideId: number) => {
    if (!user) return;

    // Add to tracked rides set
    trackedRidesRef.current.add(rideId);

    sendMessage({
      type: 'start_tracking',
      role: user.role,
      userId: user.id,
      rideId
    });
  }, [user, sendMessage]);

  const stopTrackingRide = useCallback((rideId: number) => {
    if (!user) return;

    // Remove from tracked rides set
    trackedRidesRef.current.delete(rideId);

    sendMessage({
      type: 'stop_tracking',
      role: user.role,
      userId: user.id,
      rideId
    });
  }, [user, sendMessage]);

  // Function to clear the current status update notification
  const clearStatusUpdate = useCallback(() => {
    setLatestStatusUpdate(null);
  }, []);

  // Add type-specific subscribers using ref to prevent re-renders
  const typeSubscribersRef = useRef<Record<string, Set<MessageHandler>>>({});

  // Subscribe to a specific message type
  const subscribe = useCallback((type: string, handler: MessageHandler) => {
    if (!typeSubscribersRef.current[type]) {
      typeSubscribersRef.current[type] = new Set();
    }
    typeSubscribersRef.current[type].add(handler);

    // Also register a generic handler if one doesn't exist yet
    if (!messageHandlers[type]) {
      registerHandler(type, (data) => {
        // This will call all subscribers for this message type
        if (typeSubscribersRef.current[type]) {
          typeSubscribersRef.current[type].forEach(subscriber => {
            try {
              subscriber(data);
            } catch (error) {
              console.error(`Error in subscriber for ${type}:`, error);
            }
          });
        }
      });
    }
  }, [messageHandlers, registerHandler]);

  // Unsubscribe from a specific message type
  const unsubscribe = useCallback((type: string, handler: MessageHandler) => {
    if (typeSubscribersRef.current[type]) {
      typeSubscribersRef.current[type].delete(handler);

      // If no more subscribers, unregister the handler
      if (typeSubscribersRef.current[type].size === 0) {
        unregisterHandler(type);
        delete typeSubscribersRef.current[type];
      }
    }
  }, [unregisterHandler]);

  // Provide a stable context value 
  const contextValue = {
    connected: connected || fallbackMode, // Report as "connected" in fallback mode
    registerHandler, 
    unregisterHandler, 
    sendMessage,
    startTrackingRide,
    stopTrackingRide,
    latestStatusUpdate,
    clearStatusUpdate,
    socket: socketRef.current,
    subscribe,
    unsubscribe,
    fallbackMode // Expose fallback mode status
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
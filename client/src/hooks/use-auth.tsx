import { createContext, ReactNode, useContext, useRef, useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser, loginSchema } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { z } from "zod";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, z.infer<typeof loginSchema>>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, z.infer<typeof insertUserSchema>>;
  renewSession: () => Promise<boolean>;
};

// Define the login data type using the schema directly
type LoginData = z.infer<typeof loginSchema>;

export const AuthContext = createContext<AuthContextType | null>(null);

// Custom event for notifying about logout
export const LOGOUT_EVENT = 'myambulex:logout';

// Hook to handle cleanup of WebSocket connections during logout
export function useLogoutWebsocket() {
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Create a listener for the logout event - WebSocket functionality removed
    const handleLogout = () => {
      console.log("Setting up myambulex:logout listener");
      // No WebSocket cleanup needed - using polling system
    };

    window.addEventListener(LOGOUT_EVENT, handleLogout);

    return () => {
      window.removeEventListener(LOGOUT_EVENT, handleLogout);
    };
  }, []);

  // Always return null - no WebSocket connection
  socketRef.current = null;
  return socketRef;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isInitialized, setIsInitialized] = useState(false);

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false, // Don't retry 401 errors
    staleTime: 0, // Always check authentication status
    refetchOnWindowFocus: false, // Prevent excessive requests
  });

  // Set initialized when query completes
  useEffect(() => {
    if (!isLoading) {
      setIsInitialized(true);
    }
  }, [isLoading]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("Attempting login with:", { 
        username: credentials.username, 
        passwordLength: credentials.password ? credentials.password.length : 0 
      });

      // Clear any existing cookies with cookie issues
      document.cookie = "login_attempt=true; path=/";

      try {
        // Clear any existing session cookies before login to prevent stale cookie issues
        console.log("Clearing existing session cookies before login...");
        const cookiesToClear = ['myambulex.sid', 'connect.sid'];
        cookiesToClear.forEach(cookieName => {
          // Clear cookie for current path
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
          // Clear cookie for root domain
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}; SameSite=Lax`;
          // Clear cookie without domain specification
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
        });

        console.log("Cookies after clearing:", document.cookie);

        // Ensure we're using credentials to allow cookies
        const res = await apiRequest("POST", "/api/login", credentials, {
          extraOptions: {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          }
        });

        // Parse the response
        const userData = await res.json();
        console.log("Login successful, user data:", userData);

        // Log cookies for debugging
        console.log("Cookies after login:", document.cookie);

        // Clear the login attempt flag
        document.cookie = "login_attempt=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";

        return userData;
      } catch (error) {
        console.error("Login error:", error);

        // Clear the login attempt flag
        document.cookie = "login_attempt=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";

        throw error;
      }
    },
    onSuccess: (user: SelectUser) => {
      console.log("Setting user data in query cache");
      queryClient.setQueryData(["/api/user"], user);

      // Invalidate any queries that might depend on authentication
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });

      // Redirect based on user role
      if (user.role === "rider") {
        setLocation("/rider/dashboard");
      } else if (user.role === "driver") {
        setLocation("/driver/dashboard");
      } else if (user.role === "admin") {
        setLocation("/admin/dashboard");
      }

      toast({
        title: "Login successful",
        description: `Welcome back, ${user.fullName}!`,
      });

      // Force session renewal event for WebSocket with new session
      setTimeout(() => {
        const newSessionCookie = document.cookie
          .split(';')
          .find(row => row.trim().startsWith('myambulex.sid='))
          ?.split('=')[1];

        if (newSessionCookie) {
          console.log("Dispatching session renewal event with new session:", {
            newSessionPrefix: newSessionCookie.substring(0, 15) + '...',
            fullCookieLength: newSessionCookie.length,
            rawCookie: document.cookie.substring(0, 100) + '...'
          });

          window.dispatchEvent(new CustomEvent('session-renewed', {
            detail: { 
              newSessionId: newSessionCookie,
              forceReconnect: true,
              timestamp: Date.now(),
              reason: 'login_successful'
            }
          }));
        } else {
          console.warn("No session cookie found after login - implementing retry strategy");

          // Implement retry strategy with multiple attempts
          let retryAttempt = 0;
          const maxRetries = 3;

          const retrySessionDetection = () => {
            retryAttempt++;
            console.log(`Session detection retry attempt ${retryAttempt}/${maxRetries}`);

            const retrySessionCookie = document.cookie
              .split(';')
              .find(row => row.trim().startsWith('myambulex.sid='))
              ?.split('=')[1];

            if (retrySessionCookie) {
              console.log("Session found on retry, dispatching renewal event");
              window.dispatchEvent(new CustomEvent('session-renewed', {
                detail: { 
                  newSessionId: retrySessionCookie,
                  forceReconnect: true,
                  timestamp: Date.now(),
                  reason: `login_retry_${retryAttempt}`
                }
              }));
            } else if (retryAttempt < maxRetries) {
              console.log(`Session still not found, scheduling retry ${retryAttempt + 1}`);
              setTimeout(retrySessionDetection, 1000);
            } else {
              console.error("Session not found after all retries, WebSocket may not connect properly");
              // Dispatch event anyway to trigger WebSocket connection attempt
              window.dispatchEvent(new CustomEvent('session-renewed', {
                detail: { 
                  newSessionId: null,
                  forceReconnect: true,
                  timestamp: Date.now(),
                  reason: 'login_no_session_found'
                }
              }));
            }
          };

          setTimeout(retrySessionDetection, 1000);
        }
      }, 2000); // Increased delay to 2 seconds to ensure session is fully written
    },
    onError: (error: Error) => {
      console.error("Login mutation error:", error);
      toast({
        title: "Login failed",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: any) => {
      console.log("=== REGISTRATION ATTEMPT ===");
      console.log("Full userData received:", userData);
      console.log("Attempting registration with:", { 
        username: userData.username, 
        fullName: userData.fullName,
        role: userData.role,
        email: userData.email,
        phone: userData.phone,
        hasBetaCode: !!userData.betaInviteCode,
        betaCode: userData.betaInviteCode
      });

      try {
        console.log("Making API request to /api/register...");
        const res = await apiRequest("POST", "/api/register", userData);
        console.log("Raw response:", res);
        
        const userResponse = await res.json();
        console.log("Registration successful, user data:", userResponse);
        console.log("=== REGISTRATION SUCCESS ===");
        return userResponse;
      } catch (error) {
        console.error("=== REGISTRATION ERROR ===");
        console.error("Registration error:", error);
        console.error("Error details:", {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
        throw error;
      }
    },
    onSuccess: (user: SelectUser) => {
      console.log("Setting user data in query cache after registration");
      queryClient.setQueryData(["/api/user"], user);

      // Invalidate any queries that might depend on authentication
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });

      // Redirect based on user role
      if (user.role === "rider") {
        setLocation("/rider/dashboard");
      } else if (user.role === "driver") {
        setLocation("/driver/dashboard");
      } else if (user.role === "admin") {
        setLocation("/admin/dashboard");
      }

      toast({
        title: "Registration successful", 
        description: `Welcome to MyAmbulex, ${user.fullName}!`,
      });

      // Force session renewal event for WebSocket with new session
      setTimeout(() => {
        const newSessionCookie = document.cookie
          .split(';')
          .find(row => row.trim().startsWith('myambulex.sid='))
          ?.split('=')[1];

        if (newSessionCookie) {
          console.log("Dispatching session renewal event after registration:", {
            newSessionPrefix: newSessionCookie.substring(0, 15) + '...'
          });

          window.dispatchEvent(new CustomEvent('session-renewed', {
            detail: { newSessionId: newSessionCookie }
          }));
        }
      }, 500);
    },
    onError: (error: Error) => {
      console.error("Registration mutation error:", error);
      
      // Handle specific error cases
      if (error.message.includes("Username already exists")) {
        toast({
          title: "Registration Failed",
          description: "This username is already taken. Please choose a different username.",
          variant: "destructive",
        });
      } else if (error.message.includes("Email already exists")) {
        toast({
          title: "Registration Failed", 
          description: "This email address is already registered. Please use a different email or try logging in.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Registration failed",
          description: error.message || "Could not create account. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Abort controller for cancelling pending API requests
  const abortControllersRef = useRef<Set<AbortController>>(new Set());

  // Flag to track if logout is in progress
  const isLoggingOutRef = useRef<boolean>(false);

  // Add a wrapper around apiRequest that registers abort controllers
  const createCancellableRequest = async (method: string, url: string, data?: any) => {
    // Don't make new requests if logging out
    if (isLoggingOutRef.current) {
      console.log(`Request to ${url} cancelled - logout in progress`);
      throw new Error('Logout in progress');
    }

    // Create an abort controller and register it
    const controller = new AbortController();
    abortControllersRef.current.add(controller);

    try {
      // Pass the options object with signal to apiRequest correctly
      const options = { signal: controller.signal };
      const result = await apiRequest(method, url, data, options);

      // Request completed, remove the controller
      abortControllersRef.current.delete(controller);
      return result;
    } catch (error) {
      // Request failed, remove the controller
      abortControllersRef.current.delete(controller);
      throw error;
    }
  };

  const logoutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      console.log("Starting logout process");

      // Mark that logout is in progress to prevent new requests
      isLoggingOutRef.current = true;

      // Set a cookie to indicate we're in the process of logging out
      document.cookie = "logging_out=true; path=/; max-age=30"; // Valid for 30 seconds

      // 1. First, cancel all pending API requests
      console.log(`Cancelling ${abortControllersRef.current.size} pending API requests`);
      abortControllersRef.current.forEach(controller => {
        try {
          controller.abort();
        } catch (e) {
          console.error("Error aborting request:", e);
        }
      });
      abortControllersRef.current.clear();

      // 2. Prevent React Query from making new requests
      queryClient.cancelQueries();

      // 3. Dispatch logout event to close WebSocket connections
      window.dispatchEvent(new Event(LOGOUT_EVENT));

      // 4. Wait for WebSocket and other cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // 5. Clear all timeouts (backup measure)
      try {
        const maxTimeout = 3000; // Reasonable upper limit
        for(let i = 1; i < maxTimeout; i++) {
          window.clearTimeout(i);
        }
        console.log(`Attempted to clear up to ${maxTimeout} potential timeouts`);
      } catch (e) {
        console.error("Error clearing timeouts:", e);
      }

      // 6. Clear React Query cache before server logout
      // This prevents unauthorized requests from firing after logout
      console.log("Clearing client cache before server logout");
      queryClient.setQueryData(["/api/user"], null);
      queryClient.clear();

      // 7. Finally, make the server logout request - but don't return the response
      await apiRequest("POST", "/api/logout");

      // Clear session cookies on logout to prevent stale cookie issues
      console.log("Clearing session cookies on logout...");
      const cookiesToClear = ['myambulex.sid', 'connect.sid'];
      cookiesToClear.forEach(cookieName => {
        // Clear cookie for current path
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
        // Clear cookie for root domain
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}; SameSite=Lax`;
        // Clear cookie without domain specification
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
      });

      console.log("Cookies after logout cleanup:", document.cookie);

      // Return void to match the type
      return;
    },
    onSuccess: () => {
      console.log("Logout successful, finalizing cleanup");

      // Clear the logout cookie so future logins work properly
      document.cookie = "logging_out=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";

      // Navigate to home page
      setLocation("/");

      toast({
        title: "Signed Out Successfully",
        description: "Thank you for using MyAmbulex. You have been safely signed out of your account.",
      });

      // Reset logout flag after redirect
      setTimeout(() => {
        isLoggingOutRef.current = false;
      }, 1000);
    },
    onError: (error: Error) => {
      console.error("Logout failed:", error);

      // Clear the logout cookie so future logins work properly
      document.cookie = "logging_out=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";

      // Even if server logout fails, we should still consider the user logged out client-side
      queryClient.setQueryData(["/api/user"], null);
      queryClient.clear();

      toast({
        title: "Signed Out",
        description: "You have been signed out of the application. Please sign in again to continue.",
      });

      setLocation("/");

      // Reset logout flag after redirect
      setTimeout(() => {
        isLoggingOutRef.current = false;
      }, 1000);
    },
  });

  const renewSession = async (): Promise<boolean> => {
    console.log("Attempting to renew session...");
    try {
      // Make a request to a special endpoint to refresh the session
      const res = await apiRequest("POST", "/api/refresh-session", {}, {
        extraOptions: {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }
      });

      if (res.ok) {
        const userData = await res.json();
        console.log("Session renewal successful, user data:", userData);

        // Update query cache with the new user data
        queryClient.setQueryData(["/api/user"], userData);

        // Force session renewal event for WebSocket with new session
        const newSessionCookie = document.cookie
          .split(';')
          .find(row => row.trim().startsWith('myambulex.sid='))
          ?.split('=')[1];

        if (newSessionCookie) {
          console.log("Dispatching session renewal event after renewal:", {
            newSessionPrefix: newSessionCookie.substring(0, 15) + '...'
          });

          window.dispatchEvent(new CustomEvent('session-renewed', {
            detail: { 
              newSessionId: newSessionCookie,
              forceReconnect: true,
              timestamp: Date.now(),
              reason: 'session_renewal_successful'
            }
          }));
        }

        return true;
      } else {
        console.error("Session renewal failed:", res.status, res.statusText);
        return false;
      }
    } catch (error) {
      console.error("Session renewal error:", error);
      return false;
    }
  };

  // Listen for session renewal requests
  useEffect(() => {
    const handleSessionRenewal = async (event: CustomEvent) => {
      const detail = event.detail || {};

      if (detail.reason === 'websocket_auth_failed') {
        console.log("Received WebSocket authentication failure - attempting session renewal");
        const success = await renewSession();

        if (!success) {
          console.log("Session renewal failed - user needs to log in again");
          // Force logout if session renewal fails
          await logoutMutation.mutateAsync();
        }
      }
    };

    window.addEventListener('session-renewal', handleSessionRenewal as EventListener);

    return () => {
      window.removeEventListener('session-renewal', handleSessionRenewal as EventListener);
    };
  }, [logoutMutation]);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        isInitialized,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        renewSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
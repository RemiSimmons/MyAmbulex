import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { SessionExpiredDialog } from "@/components/session-expired-dialog";
import { useAuth } from "@/hooks/use-auth";

interface SessionContextType {
  handleSessionExpired: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [showSessionExpiredDialog, setShowSessionExpiredDialog] = useState(false);
  const { user } = useAuth();
  
  // Counter to keep track of 401 errors
  const [unauthorizedCount, setUnauthorizedCount] = useState(0);
  
  // Reset the counter when user changes
  useEffect(() => {
    setUnauthorizedCount(0);
  }, [user]);

  // Global event handler for API errors
  useEffect(() => {
    // Create a listener for API errors
    const handleApiError = (event: Event) => {
      const error = (event as CustomEvent<any>).detail;
      
      if (error && error.statusCode === 401) {
        // Skip login attempts with wrong password
        const isLoginAttempt = error.url === '/api/login';
        
        if (isLoginAttempt) {
          console.log("Skipping 401 error from login attempt - wrong credentials");
          return;
        }
        
        console.log("Caught 401 error, might be session expiration", error);
        setUnauthorizedCount(prev => {
          const newCount = prev + 1;
          console.log(`Unauthorized error count: ${newCount}`);
          return newCount;
        });
      }
    };

    // Also listen for fetch errors in general
    const handleFetchError = (event: ErrorEvent) => {
      if (event.message && event.message.includes('fetch') && event.message.includes('401')) {
        console.log("Caught fetch 401 error via window.onerror");
        setUnauthorizedCount(prev => prev + 1);
      }
    };

    window.addEventListener("api-error", handleApiError);
    window.addEventListener("error", handleFetchError);
    
    return () => {
      window.removeEventListener("api-error", handleApiError);
      window.removeEventListener("error", handleFetchError);
    };
  }, []);
  
  // Flag to track if user is logging out
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Listen for logout events from the auth context
  useEffect(() => {
    console.log("Setting up myambulex:logout listener");
    
    const handleLogout = () => {
      console.log("🔑 Logout event detected in session context");
      setIsLoggingOut(true);
      // Reset the flag after a timeout to allow for navigation
      setTimeout(() => {
        console.log("Resetting logout flag");
        setIsLoggingOut(false);
      }, 2000);
    };

    window.addEventListener("myambulex:logout", handleLogout);
    return () => {
      window.removeEventListener("myambulex:logout", handleLogout);
    };
  }, []);
  
  // Effect to show dialog after 401 errors
  useEffect(() => {
    let timeoutId: number;
    
    if (unauthorizedCount >= 1) {
      // Check for login attempt cookie
      const cookies = document.cookie.split(';');
      const isLoginAttempt = cookies.some(cookie => 
        cookie.trim().startsWith('login_attempt='));
      
      // Skip showing dialog if we're on the auth page, in the process of logging out,
      // or if there's an active login attempt (failed login)
      if (window.location.pathname === '/auth' || isLoggingOut || isLoginAttempt) {
        console.log('Skipping session expired dialog on auth page, during logout, or during login attempt');
        setUnauthorizedCount(0);
        return;
      }
      
      // Show dialog after sufficient 401 errors 
      if (unauthorizedCount >= 2) {
        console.log(`Session expired (${unauthorizedCount} errors), showing dialog`);
        setShowSessionExpiredDialog(true);
        // Reset the counter after showing dialog
        setUnauthorizedCount(0);
      } else {
        // Set a short timeout to detect if more 401s are coming
        timeoutId = window.setTimeout(() => {
          // Reset counter if we only saw a single 401 and it wasn't followed by others
          if (unauthorizedCount === 1) {
            console.log('Single 401 error timeout expired, resetting counter');
            setUnauthorizedCount(0);
          }
        }, 2000);
      }
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [unauthorizedCount, user]);

  const handleSessionExpired = useCallback(() => {
    setShowSessionExpiredDialog(true);
  }, []);

  return (
    <SessionContext.Provider value={{ handleSessionExpired }}>
      {children}
      <SessionExpiredDialog 
        open={showSessionExpiredDialog} 
        onOpenChange={setShowSessionExpiredDialog}
      />
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
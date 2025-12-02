import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

interface SessionExpiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SessionExpiredDialog({
  open,
  onOpenChange,
}: SessionExpiredDialogProps) {
  // Use the useAuth hook to redirect to login
  const { logoutMutation } = useAuth();
  const [, navigate] = useLocation();
  
  const handleRelogin = async () => {
    try {
      // First logout to clear any expired session data
      await logoutMutation.mutateAsync();
    } catch (error) {
      console.error("Error during logout:", error);
    }
    
    // Then navigate to auth page
    onOpenChange(false);
    navigate("/auth");
  };
  
  // Check if we're in the process of logging out
  const isLoggingOut = document.cookie
    .split(';')
    .some(cookie => cookie.trim().startsWith('logging_out='));
  
  // Don't show the dialog if we're logging out
  if (isLoggingOut) {
    console.log("Suppressing session expired dialog during logout");
    // Allow dialog to be closed on next render
    setTimeout(() => onOpenChange(false), 100);
    return null;
  }
  
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session Expired</AlertDialogTitle>
          <AlertDialogDescription>
            Your session has expired. Please log in again to continue.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleRelogin}>
            Log in again
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function useSessionExpired() {
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const { logoutMutation } = useAuth();
  const [, navigate] = useLocation();

  // Function to handle session expiration
  const handleSessionExpired = () => {
    setIsSessionExpired(true);
  };

  // Function to redirect user to login
  const handleRelogin = async () => {
    try {
      // First logout to clear any expired session data
      await logoutMutation.mutateAsync();
    } catch (error) {
      console.error("Error during logout:", error);
    }
    
    // Then navigate to auth page
    setIsSessionExpired(false);
    navigate("/auth");
  };

  // Listen for 401 Unauthorized errors using the custom api-error event
  useEffect(() => {
    const handleApiError = (event: Event) => {
      const error = (event as CustomEvent<any>).detail;
      
      if (error && error.statusCode === 401) {
        console.log("Session expired dialog detected 401 error:", error);
        handleSessionExpired();
      }
    };

    // Add listener for api-error events
    window.addEventListener("api-error", handleApiError);

    return () => {
      window.removeEventListener("api-error", handleApiError);
    };
  }, []);

  // This dialog wrapper component adapts our hook to the existing dialog
  const SessionExpiredDialogWrapper = () => (
    <SessionExpiredDialog
      open={isSessionExpired}
      onOpenChange={setIsSessionExpired}
    />
  );

  return {
    isSessionExpired,
    handleSessionExpired,
    handleRelogin,
    SessionExpiredDialogWrapper,
  };
}
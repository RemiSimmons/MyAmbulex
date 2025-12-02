import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: React.ComponentType;
}) {
  const { user, isLoading } = useAuth();
  
  // Check driver onboarding status if user is a driver
  const { data: driverStatus, isLoading: isLoadingDriverStatus } = useQuery({
    queryKey: ['/api/driver/status'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/driver/status');
        if (!res.ok) {
          console.error('Failed to fetch driver status');
          return { isOnboarded: true }; // Default to true to prevent redirect loops
        }
        return await res.json();
      } catch (error) {
        console.error('Error fetching driver status:', error);
        return { isOnboarded: true }; // Default to true to prevent redirect loops
      }
    },
    enabled: !!user && user.role === 'driver',
  });
  
  // Show loading state
  if (isLoading || (user?.role === 'driver' && isLoadingDriverStatus)) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Check if the path matches the user's role
  const roleFromPath = path.split('/')[1]; // Extract 'rider', 'driver', or 'admin'
  
  // List of general paths that don't require role-specific redirects
  const generalPaths = ['settings', 'profile', 'chat', 'alerts', 'help', 'payment'];
  
  // If trying to access a path that doesn't match their role, redirect to their dashboard
  // Exception: general paths (like /settings, /profile) are allowed for all users
  if (user.role !== roleFromPath && path !== '/' && !generalPaths.includes(roleFromPath)) {
    return (
      <Route path={path}>
        <Redirect to={`/${user.role}/dashboard`} />
      </Route>
    );
  }
  
  // For drivers that aren't onboarded yet and trying to access a page that isn't onboarding
  if (
    user.role === 'driver' && 
    path !== '/driver/onboarding' && 
    !driverStatus?.isOnboarded && 
    // Allow drivers with pending applications to access dashboard
    !['active', 'pending'].includes(driverStatus?.application?.status || '') &&
    // Only check these statuses if the path is not dashboard
    (path !== '/driver/dashboard' || !driverStatus?.application?.status) &&
    !path.includes('document')
  ) {
    return (
      <Route path={path}>
        <Redirect to="/driver/onboarding" />
      </Route>
    );
  }

  return (
    <Route path={path}>
      <Component />
    </Route>
  );
}

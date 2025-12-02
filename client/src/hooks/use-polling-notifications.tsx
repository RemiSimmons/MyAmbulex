
import { useEffect, useCallback } from 'react';
import { useAuth } from './use-auth';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';

export function usePollingNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const pollForUpdates = useCallback(async () => {
    if (!user) return;

    try {
      // Invalidate all relevant queries to trigger fresh data fetching
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/rides'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/ride-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/rider/rides'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/driver/rides'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/driver/bids'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/messages'] }),
      ]);

      console.log('Polling: Updated all data queries');
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, [user, queryClient]);

  useEffect(() => {
    if (!user) return;

    console.log('Starting polling service for user:', user.username);
    
    // Initial poll
    pollForUpdates();

    // Set up reasonable polling frequency - reduced from excessive polling
    const pollFrequency = 30000; // 30 seconds - much more reasonable
    const pollInterval = setInterval(pollForUpdates, pollFrequency);

    return () => {
      clearInterval(pollInterval);
      console.log('Stopped polling service');
    };
  }, [user, pollForUpdates]);

  return { pollForUpdates };
}

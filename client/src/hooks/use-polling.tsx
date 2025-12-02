
import { useCallback } from 'react';
import { useAuth } from './use-auth';
import { useQueryClient } from '@tanstack/react-query';

export function usePolling() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

      console.log('Manual poll: Updated all data queries');
    } catch (error) {
      console.error('Manual polling error:', error);
    }
  }, [user, queryClient]);

  return { pollForUpdates };
}

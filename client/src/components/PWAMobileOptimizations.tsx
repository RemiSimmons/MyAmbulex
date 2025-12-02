import { useEffect, useState } from 'react';
import { usePWA, useNetworkStatus } from '@/hooks/usePWA';
import { Wifi, WifiOff, Download, Share, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export function PWAMobileHeader() {
  const { isStandalone, isInstalled } = usePWA();
  const isOnline = useNetworkStatus();

  // Only show in PWA mode
  if (!isStandalone && !isInstalled) {
    return null;
  }

  return (
    <div className="bg-primary/5 border-b border-primary/10 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={isOnline ? "default" : "destructive"} className="text-xs">
            {isOnline ? (
              <>
                <Wifi className="w-3 h-3 mr-1" />
                Online
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 mr-1" />
                Offline
              </>
            )}
          </Badge>
          {isInstalled && (
            <Badge variant="secondary" className="text-xs">
              PWA Mode
            </Badge>
          )}
        </div>
        
        <div className="text-xs text-gray-600">
          MyAmbulex
        </div>
      </div>
    </div>
  );
}

export function PWAQuickActions() {
  const { shareApp, registerForNotifications } = usePWA();
  const { toast } = useToast();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    // Check if notifications are already enabled
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const handleShare = async () => {
    try {
      await shareApp();
      toast({
        title: "Shared Successfully",
        description: "MyAmbulex link shared!",
      });
    } catch (error) {
      toast({
        title: "Share Failed",
        description: "Could not share the app",
        variant: "destructive",
      });
    }
  };

  const handleNotifications = async () => {
    try {
      const success = await registerForNotifications();
      if (success) {
        setNotificationsEnabled(true);
        toast({
          title: "Notifications Enabled",
          description: "You'll receive ride updates and notifications",
        });
      } else {
        toast({
          title: "Notifications Denied",
          description: "Enable notifications in your browser settings",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Notification Setup Failed",
        description: "Could not enable notifications",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="m-4 p-4">
      <h3 className="font-semibold text-sm mb-3">Quick Actions</h3>
      
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={handleShare}
          variant="outline"
          size="sm"
          className="h-auto p-3 flex flex-col items-center gap-2"
        >
          <Share className="w-4 h-4" />
          <span className="text-xs">Share App</span>
        </Button>
        
        <Button
          onClick={handleNotifications}
          variant="outline"
          size="sm"
          className="h-auto p-3 flex flex-col items-center gap-2"
          disabled={notificationsEnabled}
        >
          <Bell className="w-4 h-4" />
          <span className="text-xs">
            {notificationsEnabled ? 'Notifications On' : 'Enable Notifications'}
          </span>
        </Button>
      </div>
    </Card>
  );
}

export function PWAOfflineIndicator() {
  const isOnline = useNetworkStatus();
  const [showOfflineActions, setShowOfflineActions] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      const timer = setTimeout(() => setShowOfflineActions(true), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowOfflineActions(false);
    }
  }, [isOnline]);

  if (isOnline) {
    return null;
  }

  return (
    <Card className="m-4 p-4 border-amber-200 bg-amber-50">
      <div className="flex items-center gap-3 mb-3">
        <WifiOff className="w-5 h-5 text-amber-600" />
        <div>
          <h3 className="font-semibold text-sm text-amber-900">
            You're Offline
          </h3>
          <p className="text-xs text-amber-700">
            Some features are limited without internet
          </p>
        </div>
      </div>

      {showOfflineActions && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-amber-900">
            Available Offline:
          </h4>
          <ul className="text-xs text-amber-700 space-y-1">
            <li>• View cached ride history</li>
            <li>• Access emergency contacts</li>
            <li>• Review saved locations</li>
            <li>• Browse app settings</li>
          </ul>
        </div>
      )}
    </Card>
  );
}

export function PWAMobileNavigation() {
  const { isStandalone } = usePWA();
  
  // Enhanced mobile navigation for PWA mode
  if (!isStandalone) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 safe-area-inset-bottom">
      <div className="flex justify-around items-center">
        {/* Bottom navigation would go here */}
        <div className="text-xs text-gray-500 text-center">
          PWA Navigation
        </div>
      </div>
    </div>
  );
}

// Hook for PWA-specific mobile enhancements
export function useMobileOptimizations() {
  const { isStandalone, isInstalled } = usePWA();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Add PWA-specific CSS classes
  useEffect(() => {
    if (isStandalone || isInstalled) {
      document.body.classList.add('pwa-mode');
      
      // Add safe area padding for devices with notches
      document.documentElement.style.setProperty(
        '--safe-area-inset-top',
        'env(safe-area-inset-top, 0px)'
      );
      document.documentElement.style.setProperty(
        '--safe-area-inset-bottom',
        'env(safe-area-inset-bottom, 0px)'
      );
    }

    return () => {
      document.body.classList.remove('pwa-mode');
    };
  }, [isStandalone, isInstalled]);

  return {
    isPWAMode: isStandalone || isInstalled,
    isMobile,
    shouldShowMobileEnhancements: isMobile && (isStandalone || isInstalled)
  };
}
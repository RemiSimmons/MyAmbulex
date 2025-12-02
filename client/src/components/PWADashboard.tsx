import { useState, useEffect } from 'react';
import { usePWA, useNetworkStatus } from '@/hooks/usePWA';
import { useMobileOptimizations } from '@/components/PWAMobileOptimizations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Smartphone, 
  Wifi, 
  WifiOff, 
  Download, 
  Share, 
  Bell, 
  Settings,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function PWADashboard() {
  const { 
    isStandalone, 
    isInstalled, 
    installApp, 
    shareApp, 
    registerForNotifications 
  } = usePWA();
  
  // Check if install is available
  const [canInstall, setCanInstall] = useState(false);
  
  // Listen for install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setCanInstall(true);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);
  const isOnline = useNetworkStatus();
  const { isPWAMode, isMobile } = useMobileOptimizations();
  const { toast } = useToast();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const handleInstall = async () => {
    try {
      await installApp();
      toast({
        title: "App Installed",
        description: "MyAmbulex has been installed on your device",
      });
    } catch (error) {
      toast({
        title: "Installation Failed",
        description: "Could not install the app",
        variant: "destructive",
      });
    }
  };

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

  // Only show PWA dashboard to mobile users or installed PWA users
  if (!isMobile && !isPWAMode) {
    return null;
  }

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-primary" />
          App Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-600" />
            )}
            <span className="text-sm">Connection</span>
          </div>
          <Badge variant={isOnline ? "default" : "destructive"}>
            {isOnline ? "Online" : "Offline"}
          </Badge>
        </div>

        {/* Installation Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-blue-600" />
            <span className="text-sm">Installation</span>
          </div>
          {isInstalled || isStandalone ? (
            <Badge variant="default" className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Installed
            </Badge>
          ) : canInstall ? (
            <Button onClick={handleInstall} size="sm" variant="outline">
              Install
            </Button>
          ) : (
            <Badge variant="secondary">Browser Only</Badge>
          )}
        </div>

        {/* Notification Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-orange-600" />
            <span className="text-sm">Notifications</span>
          </div>
          {notificationsEnabled ? (
            <Badge variant="default" className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Enabled
            </Badge>
          ) : (
            <Button onClick={handleNotifications} size="sm" variant="outline">
              Enable
            </Button>
          )}
        </div>

        <Separator />

        {/* PWA Actions */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleShare}
              variant="outline"
              size="sm"
              className="justify-start"
            >
              <Share className="w-4 h-4 mr-2" />
              Share App
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="justify-start"
              onClick={() => {
                // Navigate to settings
                window.location.href = '/settings';
              }}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* PWA Benefits */}
        {isPWAMode && (
          <div className="space-y-2">
            <Separator />
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-gray-600">
                You're using the full app experience with offline support
              </span>
            </div>
          </div>
        )}

        {/* Offline Mode Info */}
        {!isOnline && (
          <div className="space-y-2">
            <Separator />
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-900">
                  Offline Mode
                </span>
              </div>
              <p className="text-xs text-amber-700">
                Some features are limited. Available: cached rides, emergency contacts, 
                saved locations, and app settings.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// PWA Feature Detection Component
export function PWAFeatureSupport() {
  const features = {
    serviceWorker: 'serviceWorker' in navigator,
    pushNotifications: 'PushManager' in window,
    backgroundSync: 'serviceWorker' in navigator && 'sync' in (window as any).ServiceWorkerRegistration.prototype,
    webShare: 'share' in navigator,
    installPrompt: 'onbeforeinstallprompt' in window,
    standalone: window.matchMedia('(display-mode: standalone)').matches
  };

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle className="text-sm">PWA Feature Support</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {Object.entries(features).map(([feature, supported]) => (
            <div key={feature} className="flex items-center justify-between">
              <span className="capitalize">{feature.replace(/([A-Z])/g, ' $1')}</span>
              <Badge variant={supported ? "default" : "secondary"} className="text-xs">
                {supported ? "✓" : "✗"}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
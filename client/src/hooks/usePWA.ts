import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  isStandalone: boolean;
}

interface PWAActions {
  installApp: () => Promise<boolean>;
  updateApp: () => Promise<void>;
  shareApp: () => Promise<void>;
  registerForNotifications: () => Promise<boolean>;
}

export function usePWA(): PWAState & PWAActions {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOnline: navigator.onLine,
    isUpdateAvailable: false,
    isStandalone: false
  });

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Check if app is running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone ||
                        document.referrer.includes('android-app://');

    // Check if app is already installed
    const isInstalled = isStandalone || localStorage.getItem('pwa-installed') === 'true';

    setState(prev => ({
      ...prev,
      isStandalone,
      isInstalled
    }));

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setState(prev => ({ ...prev, isInstallable: true }));
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      localStorage.setItem('pwa-installed', 'true');
      setState(prev => ({ 
        ...prev, 
        isInstalled: true, 
        isInstallable: false 
      }));
      setDeferredPrompt(null);
    };

    // Listen for online/offline events
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration);
          setServiceWorkerRegistration(registration);

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setState(prev => ({ ...prev, isUpdateAvailable: true }));
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'UPDATE_AVAILABLE') {
          setState(prev => ({ ...prev, isUpdateAvailable: true }));
        }
      });
    }

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const installApp = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        localStorage.setItem('pwa-installed', 'true');
        setState(prev => ({ 
          ...prev, 
          isInstalled: true, 
          isInstallable: false 
        }));
        setDeferredPrompt(null);
        return true;
      }
    } catch (error) {
      console.error('[PWA] Installation failed:', error);
    }
    
    return false;
  };

  const updateApp = async (): Promise<void> => {
    if (!serviceWorkerRegistration?.waiting) return;

    try {
      serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Listen for the controlling service worker change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

      setState(prev => ({ ...prev, isUpdateAvailable: false }));
    } catch (error) {
      console.error('[PWA] Update failed:', error);
    }
  };

  const shareApp = async (): Promise<void> => {
    const shareData = {
      title: 'MyAmbulex - Medical Transportation',
      text: 'Book reliable medical transportation with MyAmbulex',
      url: window.location.origin
    };

    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.origin);
        // You could show a toast notification here
        console.log('[PWA] App URL copied to clipboard');
      }
    } catch (error) {
      console.error('[PWA] Sharing failed:', error);
    }
  };

  const registerForNotifications = async (): Promise<boolean> => {
    if (!('Notification' in window) || !serviceWorkerRegistration) {
      console.warn('[PWA] Notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        // Subscribe to push notifications
        const subscription = await serviceWorkerRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.VAPID_PUBLIC_KEY || '')
        });

        // Send subscription to server
        // await fetch('/api/notifications/subscribe', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(subscription)
        // });

        console.log('[PWA] Push notification subscription successful');
        return true;
      }
    } catch (error) {
      console.error('[PWA] Notification registration failed:', error);
    }
    
    return false;
  };

  return {
    ...state,
    installApp,
    updateApp,
    shareApp,
    registerForNotifications
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Hook for network status
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// Hook for PWA-specific storage
export function usePWAStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(`pwa-${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setStoredValue = (newValue: T) => {
    try {
      setValue(newValue);
      localStorage.setItem(`pwa-${key}`, JSON.stringify(newValue));
    } catch (error) {
      console.error(`[PWA] Failed to store ${key}:`, error);
    }
  };

  return [value, setStoredValue] as const;
}
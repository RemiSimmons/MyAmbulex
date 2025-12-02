/**
 * PWA Utilities for service worker registration and management
 */

export async function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[PWA] Service Worker registered successfully:', registration);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New content available, refresh to update');
              // Optionally show update notification
              showUpdateNotification();
            }
          });
        }
      });

      // Listen for successful updates
      registration.addEventListener('activated', () => {
        console.log('[PWA] Service Worker activated');
      });

    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  } else {
    console.log('[PWA] Service Worker not supported or in development mode');
  }
}

function showUpdateNotification(): void {
  // This could trigger a banner or notification about updates being available
  if (window.confirm('A new version is available. Refresh to update?')) {
    window.location.reload();
  }
}

export function unregisterServiceWorker(): Promise<boolean> {
  if ('serviceWorker' in navigator) {
    return navigator.serviceWorker.ready
      .then((registration) => {
        return registration.unregister();
      })
      .catch((error) => {
        console.error('[PWA] Service Worker unregistration failed:', error);
        return false;
      });
  }
  return Promise.resolve(false);
}

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true ||
         document.referrer.includes('android-app://');
}

export function isPWAInstalled(): boolean {
  return isStandalone() || localStorage.getItem('pwa-installed') === 'true';
}
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Smartphone, Download } from 'lucide-react';
import PWAInstallationGuide from './PWAInstallationGuide';

interface PWAInstallBannerProps {
  onDismiss?: () => void;
}

export default function PWAInstallBanner({ onDismiss }: PWAInstallBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already installed (running in standalone mode)
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode || isInWebAppiOS);
    };

    // Check if user has dismissed the banner before
    const hasDismissed = localStorage.getItem('pwa-install-banner-dismissed');
    
    // Show banner if app is not installed and user hasn't dismissed it
    if (!hasDismissed) {
      checkStandalone();
      setIsVisible(!isStandalone);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwa-install-banner-dismissed', 'true');
    onDismiss?.();
  };

  if (!isVisible || isStandalone) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-green-900">
              Get the MyAmbulex App
            </h3>
            <p className="text-xs text-green-700 mt-0.5">
              Install for faster access, offline capabilities, and push notifications
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <PWAInstallationGuide 
            triggerButton={
              <Button 
                size="sm" 
                className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 h-8"
              >
                <Download className="w-3 h-3 mr-1" />
                Install App
              </Button>
            } 
          />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-green-600 hover:text-green-800 p-1 h-8 w-8"
            aria-label="Dismiss install banner"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Utility function to detect if PWA installation is available
export function useInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsInstallable(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!installPrompt) return false;

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setInstallPrompt(null);
        setIsInstallable(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Install prompt failed:', error);
      return false;
    }
  };

  return { isInstallable, promptInstall };
}
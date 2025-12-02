// Device detection utilities for PWA functionality

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;
  
  return isMobileUserAgent || (isTouchDevice && isSmallScreen);
}

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /Android/.test(navigator.userAgent);
}

export function isSafari(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes('safari') && !userAgent.includes('chrome');
}

export function isChrome(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check if running in standalone mode (PWA)
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone ||
         document.referrer.includes('android-app://');
}

export function getPWAInstallInstructions(): string {
  if (isIOS() && isSafari()) {
    return `
      For iPhone/iPad (Safari):
      1. Tap the Share button (□↗)
      2. Scroll down and tap "Add to Home Screen"
      3. Tap "Add" to install the app
    `;
  } else if (isAndroid() && isChrome()) {
    return `
      For Android (Chrome):
      1. Tap the menu (⋮)
      2. Select "Add to Home screen"
      3. Tap "Add" to install the app
    `;
  } else if (isChrome()) {
    return `
      For Desktop Chrome:
      1. Look for the install icon (⊞) in the address bar
      2. Or go to Chrome menu → "Install MyAmbulex..."
    `;
  } else {
    return `
      Installation steps:
      1. Open this page in Chrome or Safari
      2. Look for "Add to Home Screen" or install options
      3. Follow your browser's installation prompts
    `;
  }
}

export function canShowInstallPrompt(): boolean {
  // Check if the browser supports install prompts
  return 'onbeforeinstallprompt' in window;
}

export function getDeviceInfo() {
  return {
    isMobile: isMobileDevice(),
    isIOS: isIOS(),
    isAndroid: isAndroid(),
    isSafari: isSafari(),
    isChrome: isChrome(),
    isStandalone: isStandalone(),
    canInstall: canShowInstallPrompt(),
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
    viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '0x0'
  };
}
/**
 * Google Maps API Singleton - Single source of truth for Google Maps initialization
 * This file prevents duplicate API loading and infinite loops
 */

// Type definitions
interface GoogleMapsState {
  isLoaded: boolean;
  isLoading: boolean;
  error: Error | null;
  autocompleteService: any | null;
  geocoder: any | null;
  loadPromise: Promise<void> | null;
}

// Global state - singleton pattern
const mapsState: GoogleMapsState = {
  isLoaded: false,
  isLoading: false,
  error: null,
  autocompleteService: null,
  geocoder: null,
  loadPromise: null
};

// API key from environment
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS;

/**
 * Check if Google Maps API is available
 */
export function isMapsApiAvailable(): boolean {
  return !!(window.google?.maps?.places);
}

/**
 * Initialize Google Maps services
 */
function initializeServices(): boolean {
  if (mapsState.isLoaded) {
    return true;
  }

  try {
    if (window.google?.maps?.places) {
      console.log('[GoogleMaps] Initializing services');
      mapsState.autocompleteService = new window.google.maps.places.AutocompleteService();
      mapsState.geocoder = new window.google.maps.Geocoder();
      mapsState.isLoaded = true;
      console.log('[GoogleMaps] Services initialized successfully');
      return true;
    }
  } catch (error) {
    console.error('[GoogleMaps] Failed to initialize services:', error);
    mapsState.error = error instanceof Error ? error : new Error(String(error));
  }
  return false;
}

/**
 * Load Google Maps API - Single implementation to prevent infinite loops
 */
export function loadGoogleMapsApi(): Promise<void> {
  // Return existing promise if already loading
  if (mapsState.loadPromise) {
    return mapsState.loadPromise;
  }

  // If already loaded, return resolved promise
  if (mapsState.isLoaded) {
    return Promise.resolve();
  }

  // If API is already available, initialize and return
  if (isMapsApiAvailable()) {
    initializeServices();
    return Promise.resolve();
  }

  // Check if we have API key
  if (!GOOGLE_MAPS_API_KEY) {
    const error = new Error('Google Maps API key not found in environment variables');
    mapsState.error = error;
    return Promise.reject(error);
  }

  // Start loading
  mapsState.isLoading = true;
  
  mapsState.loadPromise = new Promise<void>((resolve, reject) => {
    try {
      // Check if script already exists
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        console.log('[GoogleMaps] Script already exists, waiting for callback');
        return;
      }

      // Create callback function
      const callbackName = 'initGoogleMapsCallback';
      (window as any)[callbackName] = () => {
        console.log('[GoogleMaps] API loaded via callback');
        
        // Clean up callback
        delete (window as any)[callbackName];
        
        // Initialize services
        if (initializeServices()) {
          mapsState.isLoading = false;
          resolve();
        } else {
          const error = new Error('Failed to initialize Google Maps services');
          mapsState.error = error;
          mapsState.isLoading = false;
          reject(error);
        }
      };

      // Create and load script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      
      script.onerror = () => {
        const error = new Error('Failed to load Google Maps API script');
        mapsState.error = error;
        mapsState.isLoading = false;
        delete (window as any)[callbackName];
        reject(error);
      };

      console.log('[GoogleMaps] Loading API script');
      document.head.appendChild(script);
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      mapsState.error = err;
      mapsState.isLoading = false;
      reject(err);
    }
  });

  return mapsState.loadPromise;
}

/**
 * Get Google Maps services
 */
export function getGoogleMapsServices() {
  return {
    autocompleteService: mapsState.autocompleteService,
    geocoder: mapsState.geocoder,
    isLoaded: mapsState.isLoaded,
    isLoading: mapsState.isLoading,
    error: mapsState.error
  };
}

/**
 * Get place predictions
 */
export async function getPlacePredictions(input: string): Promise<any[]> {
  if (!mapsState.autocompleteService) {
    throw new Error('Google Maps AutocompleteService not initialized');
  }

  return new Promise((resolve, reject) => {
    mapsState.autocompleteService.getPlacePredictions(
      { input },
      (predictions: any[], status: any) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          resolve(predictions || []);
        } else {
          reject(new Error(`Places service failed with status: ${status}`));
        }
      }
    );
  });
}

/**
 * Geocode an address
 */
export async function geocodeAddress(address: string): Promise<any> {
  if (!mapsState.geocoder) {
    throw new Error('Google Maps Geocoder not initialized');
  }

  return new Promise((resolve, reject) => {
    mapsState.geocoder.geocode({ address }, (results: any[], status: any) => {
      if (status === window.google.maps.GeocoderStatus.OK && results[0]) {
        resolve(results[0]);
      } else {
        reject(new Error(`Geocoding failed with status: ${status}`));
      }
    });
  });
}

// Global type declarations
declare global {
  interface Window {
    google: any;
    initGoogleMapsCallback?: () => void;
  }
}
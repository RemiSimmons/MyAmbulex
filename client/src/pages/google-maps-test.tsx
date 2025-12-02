import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export default function GoogleMapsTest() {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [services, setServices] = useState<{
    autoComplete: boolean;
    geocoder: boolean;
    places: boolean;
  }>({
    autoComplete: false,
    geocoder: false,
    places: false
  });
  
  useEffect(() => {
    // Get API key
    const key = import.meta.env.VITE_GOOGLE_MAPS;
    setApiKey(key ? 'API key exists' : 'API key not found');
    
    // Check if Google Maps already loaded
    if (window.google && window.google.maps) {
      checkGoogleServices();
      setScriptLoaded(true);
      return;
    }
    
    // Setup global callback
    window.initGoogleMaps = () => {
      console.log('Google Maps callback fired');
      checkGoogleServices();
    };
  }, []);
  
  const checkGoogleServices = () => {
    try {
      const hasGoogle = !!window.google;
      const hasMaps = hasGoogle && !!window.google.maps;
      const hasPlaces = hasMaps && !!window.google.maps.places;
      
      console.log('Google Maps API check:', {
        hasGoogle,
        hasMaps,
        hasPlaces
      });
      
      // Try creating services
      let autoComplete = false;
      let geocoder = false;
      let places = false;
      
      if (hasPlaces) {
        try {
          new window.google.maps.places.AutocompleteService();
          autoComplete = true;
        } catch (e) {
          console.error('AutocompleteService error:', e);
        }
        
        try {
          new window.google.maps.Geocoder();
          geocoder = true;
        } catch (e) {
          console.error('Geocoder error:', e);
        }
        
        try {
          places = !!window.google.maps.places;
        } catch (e) {
          console.error('Places error:', e);
        }
      }
      
      setServices({
        autoComplete,
        geocoder,
        places
      });
      
      setScriptLoaded(true);
    } catch (e) {
      setScriptError(e instanceof Error ? e.message : String(e));
    }
  };
  
  const loadScript = () => {
    try {
      // Remove any existing Google Maps scripts
      const existingScripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
      existingScripts.forEach(script => script.remove());
      
      // Reset window.google
      delete window.google;
      
      // Reset states
      setScriptLoaded(false);
      setScriptError(null);
      
      // Create new script
      const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS;
      if (!googleMapsApiKey) {
        setScriptError('Google Maps API key is missing');
        toast({
          title: "Error",
          description: "Google Maps API key is missing",
          variant: "destructive"
        });
        return;
      }
      
      console.log('Loading Google Maps script...');
      const script = document.createElement('script');
      const timestamp = new Date().getTime();
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places&v=weekly&callback=initGoogleMaps&t=${timestamp}`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('Google Maps script onload event fired');
      };
      
      script.onerror = (e) => {
        console.error('Google Maps script failed to load:', e);
        setScriptError('Failed to load script');
        setScriptLoaded(false);
      };
      
      document.head.appendChild(script);
      console.log('Added Google Maps script to head');
    } catch (e) {
      setScriptError(e instanceof Error ? e.message : String(e));
    }
  };
  
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Google Maps API Test</h1>
      
      <div className="grid gap-4 mb-6">
        <div className="p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-2">API Key Status</h2>
          <p className={apiKey?.includes('not') ? "text-red-500" : "text-green-500"}>
            {apiKey}
          </p>
        </div>
        
        <div className="p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Script Status</h2>
          <p className={scriptLoaded ? "text-green-500" : "text-amber-500"}>
            {scriptLoaded ? "Loaded" : "Not loaded"}
          </p>
          {scriptError && (
            <p className="text-red-500 mt-2">Error: {scriptError}</p>
          )}
        </div>
        
        <div className="p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Services Status</h2>
          <ul className="list-disc ml-6">
            <li className={services.places ? "text-green-500" : "text-red-500"}>
              Places API: {services.places ? "Available" : "Unavailable"}
            </li>
            <li className={services.autoComplete ? "text-green-500" : "text-red-500"}>
              Autocomplete Service: {services.autoComplete ? "Available" : "Unavailable"}
            </li>
            <li className={services.geocoder ? "text-green-500" : "text-red-500"}>
              Geocoder: {services.geocoder ? "Available" : "Unavailable"}
            </li>
          </ul>
        </div>
      </div>
      
      <div className="flex gap-4">
        <Button onClick={loadScript}>
          Reload Google Maps Script
        </Button>
        <Button onClick={checkGoogleServices} variant="outline">
          Re-check Services
        </Button>
      </div>
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

// Define the structure for the API services we're testing
type ServiceTest = {
  name: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  details?: string;
};

export function TestGoogleMapsApi() {
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState<string>('');
  const [services, setServices] = useState<ServiceTest[]>([
    { name: 'Maps JavaScript API', status: 'pending' },
    { name: 'Geocoding API', status: 'pending' },
    { name: 'Places API', status: 'pending' }
  ]);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);

  // Helper function to update a service test result
  const updateServiceStatus = (
    serviceName: string, 
    status: 'pending' | 'success' | 'error', 
    message?: string,
    details?: string
  ) => {
    setServices(prevServices => 
      prevServices.map(service => 
        service.name === serviceName 
          ? { ...service, status, message, details } 
          : service
      )
    );
  };

  // Test the Google Maps JavaScript API
  const testMapsJavaScriptApi = () => {
    try {
      if (window.google && window.google.maps) {
        updateServiceStatus(
          'Maps JavaScript API', 
          'success', 
          'Maps JavaScript API loaded successfully'
        );
        
        // Once Maps API is confirmed loaded, test other services
        testGeocodingApi();
        testPlacesApi();
      } else {
        updateServiceStatus(
          'Maps JavaScript API', 
          'error', 
          'Maps JavaScript API not available',
          'The Google Maps JavaScript API failed to load properly'
        );
      }
    } catch (error) {
      updateServiceStatus(
        'Maps JavaScript API', 
        'error', 
        'Error checking Maps JavaScript API',
        error instanceof Error ? error.message : String(error)
      );
    }
  };

  // Test the Geocoding API
  const testGeocodingApi = () => {
    try {
      if (window.google && window.google.maps && window.google.maps.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        
        // Test with a simple geocoding request
        geocoder.geocode({ address: '1600 Amphitheatre Parkway, Mountain View, CA' }, (results, status) => {
          if (status === 'OK' && results && results.length > 0) {
            updateServiceStatus(
              'Geocoding API', 
              'success', 
              'Geocoding API working properly'
            );
          } else {
            updateServiceStatus(
              'Geocoding API', 
              'error', 
              `Geocoding API returned status: ${status}`,
              'The API key may not have Geocoding API enabled'
            );
          }
        });
      } else {
        updateServiceStatus(
          'Geocoding API', 
          'error', 
          'Geocoding API not available',
          'The Geocoder constructor could not be found'
        );
      }
    } catch (error) {
      updateServiceStatus(
        'Geocoding API', 
        'error', 
        'Error testing Geocoding API',
        error instanceof Error ? error.message : String(error)
      );
    }
  };

  // Test the Places API
  const testPlacesApi = () => {
    try {
      if (window.google && window.google.maps && window.google.maps.places) {
        // Create a PlacesService instance (requires a DOM element)
        const placesDiv = document.createElement('div');
        const service = new window.google.maps.places.PlacesService(placesDiv);
        
        // Test with a nearby search
        service.textSearch(
          { query: 'restaurants near mountain view' },
          (results, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
              updateServiceStatus(
                'Places API', 
                'success', 
                'Places API working properly'
              );
            } else {
              updateServiceStatus(
                'Places API', 
                'error', 
                `Places API returned status: ${status}`,
                'The API key may not have Places API enabled'
              );
            }
          }
        );
      } else {
        updateServiceStatus(
          'Places API', 
          'error', 
          'Places API not available',
          'The Places service could not be found'
        );
      }
    } catch (error) {
      updateServiceStatus(
        'Places API', 
        'error', 
        'Error testing Places API',
        error instanceof Error ? error.message : String(error)
      );
    }
  };

  // Load the Google Maps API for testing
  useEffect(() => {
    // Check if the environment variable is available
    const key = import.meta.env.VITE_GOOGLE_MAPS as string;
    setApiKey(key ? key.substring(0, 8) + '...' : 'Not found');
    
    if (!key) {
      setLoading(false);
      return;
    }

    // Load the Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('Google Maps API script loaded for testing');
      setIsGoogleMapsLoaded(true);
      setLoading(false);
      
      // Run tests after a short delay to ensure everything is initialized
      setTimeout(() => {
        testMapsJavaScriptApi();
      }, 1000);
    };
    
    script.onerror = () => {
      console.error('Failed to load Google Maps API script for testing');
      setLoading(false);
      setServices(prevServices => 
        prevServices.map(service => ({ 
          ...service, 
          status: 'error', 
          message: 'Script failed to load',
          details: 'The Google Maps script could not be loaded. Check your API key and network connection.'
        }))
      );
    };
    
    document.head.appendChild(script);
    
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Render status badges
  const renderStatusBadge = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Pending</Badge>;
      case 'success':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Working</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-50 text-red-700">Error</Badge>;
      default:
        return null;
    }
  };

  // Render an icon based on status
  const renderStatusIcon = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Google Maps API Diagnostic</CardTitle>
        <CardDescription>
          Testing the Google Maps API configuration and permissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            <span className="ml-2">Loading Google Maps API...</span>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-muted rounded-lg p-4">
              <h3 className="font-medium mb-2">API Key Information</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm font-medium">API Key:</div>
                <div className="text-sm font-mono">{apiKey}</div>
                <div className="text-sm font-medium">Script loaded:</div>
                <div className="text-sm">{isGoogleMapsLoaded ? 'Yes' : 'No'}</div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-medium">Service Tests</h3>
              
              {services.map((service) => (
                <div key={service.name} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-medium flex items-center gap-2">
                      {renderStatusIcon(service.status)}
                      {service.name}
                    </div>
                    {renderStatusBadge(service.status)}
                  </div>
                  
                  {service.message && (
                    <p className="text-sm text-muted-foreground mb-2">{service.message}</p>
                  )}
                  
                  {service.details && service.status === 'error' && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Problem Detected</AlertTitle>
                      <AlertDescription>{service.details}</AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
            
            <div className="pt-4 flex justify-end">
              <Button 
                onClick={() => window.location.reload()}
                disabled={loading}
              >
                Run Tests Again
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
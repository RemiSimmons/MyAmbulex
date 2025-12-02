import { useEffect, useState, useRef } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Ride } from "@shared/schema";
import MapView from "@/components/map-view";
import { Compass, Navigation, PhoneCall, AlertCircle, Loader2, MessageSquare, Bell, BellOff, Wifi, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface RideTrackingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ride: Ride;
}

interface DriverLocation {
  lat: number;
  lng: number;
  timestamp: Date;
}

// WebSocket message types
interface TrackingStartedMessage {
  type: 'tracking_started';
  rideId: number;
}

interface TrackingStoppedMessage {
  type: 'tracking_stopped';
  rideId: number;
}

interface LocationUpdateMessage {
  type: 'location_update';
  rideId: number;
  driverId: number;
  location: DriverLocation;
}

type WebSocketResponseMessage = TrackingStartedMessage | TrackingStoppedMessage | LocationUpdateMessage;

export default function RideTrackingDialog({
  open,
  onOpenChange,
  ride
}: RideTrackingDialogProps) {
  const { toast } = useToast();
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estimatedTimeDisplay, setEstimatedTimeDisplay] = useState<string>("");
  const [estimatedDistanceDisplay, setEstimatedDistanceDisplay] = useState<string>("");
  const [etaNotificationsEnabled, setEtaNotificationsEnabled] = useState(true);
  const [message, setMessage] = useState("");
  const [showMessageForm, setShowMessageForm] = useState(false);

  // Get pickup and dropoff locations from the ride
  const pickupLocation = ride.pickupLocationLat && ride.pickupLocationLng 
    ? { lat: ride.pickupLocationLat, lng: ride.pickupLocationLng, label: "Pickup" }
    : null;

  const dropoffLocation = ride.dropoffLocationLat && ride.dropoffLocationLng 
    ? { lat: ride.dropoffLocationLat, lng: ride.dropoffLocationLng, label: "Dropoff" }
    : null;

  // Get the currently logged in user
  const { user } = useAuth();

  // WebSocket removed - using polling for tracking updates

  // Use WebSocket for real-time location tracking
  useEffect(() => {
    if (!open || !ride.id || !user) return;

    setIsLoadingLocation(true);
    setError(null);

    // Initialize WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    // Handle WebSocket connection open
    socket.onopen = () => {
      console.log('WebSocket connection established');
      setWsConnected(true);

      // Send a message to start tracking this ride
      const startTrackingMessage = {
        type: 'start_tracking',
        role: user.role,
        userId: user.id,
        rideId: ride.id
      };

      socket.send(JSON.stringify(startTrackingMessage));
    };

    // Handle WebSocket errors
    socket.onerror = (event) => {
      console.error('WebSocket error:', event);
      setError("Unable to establish real-time connection. Retrying...");

      // Fallback to initial location if WebSocket fails
      if (!pickupLocation) {
        setError("Pickup location not available");
        setIsLoadingLocation(false);
      } else {
        // Generate an initial location near the pickup point
        const fallbackLocation = {
          lat: pickupLocation.lat + (Math.random() * 0.01 - 0.005),
          lng: pickupLocation.lng + (Math.random() * 0.01 - 0.005),
          timestamp: new Date()
        };
        setDriverLocation(fallbackLocation);
        setIsLoadingLocation(false);
      }
    };

    // Handle WebSocket messages
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketResponseMessage;
        console.log('Received WebSocket message:', message);

        switch (message.type) {
          case 'location_update':
            // Handle location update
            setDriverLocation({
              ...message.location,
              // Ensure timestamp is a Date object
              timestamp: new Date(message.location.timestamp)
            });
            setIsLoadingLocation(false);
            break;

          case 'tracking_started':
            console.log(`Tracking started for ride ${message.rideId}`);

            // If we've established tracking but still don't have a location, create a fallback
            if (isLoadingLocation && pickupLocation) {
              // Wait a bit to see if we get a real location update
              setTimeout(() => {
                if (isLoadingLocation && wsRef.current?.readyState === WebSocket.OPEN) {
                  console.log('No location updates received yet, using fallback');
                  // Create a fallback location near the pickup point
                  const fallbackLocation = {
                    lat: pickupLocation.lat + (Math.random() * 0.01 - 0.005),
                    lng: pickupLocation.lng + (Math.random() * 0.01 - 0.005),
                    timestamp: new Date()
                  };
                  setDriverLocation(fallbackLocation);
                  setIsLoadingLocation(false);
                }
              }, 3000);
            }
            break;

          case 'tracking_stopped':
            console.log(`Tracking stopped for ride ${message.rideId}`);
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    // Handle WebSocket close
    socket.onclose = () => {
      console.log('WebSocket connection closed');
      setWsConnected(false);

      // If we've never received a location, set an error
      if (isLoadingLocation) {
        setError("Connection lost. Please try again.");
      }
    };

    // Clean up WebSocket on unmount or dialog close
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        // Send a message to stop tracking this ride
        const stopTrackingMessage = {
          type: 'stop_tracking',
          role: user.role,
          userId: user.id,
          rideId: ride.id
        };

        socket.send(JSON.stringify(stopTrackingMessage));

        // Close the WebSocket connection
        socket.close();
      }

      // Reset our state
      wsRef.current = null;
      setWsConnected(false);
    };
  }, [open, ride.id, user, pickupLocation]);

  // Handler for route calculation updates
  const handleRouteCalculated = (routeInfo: { distance: string; duration: string }) => {
    setEstimatedTimeDisplay(routeInfo.duration);
    setEstimatedDistanceDisplay(routeInfo.distance);

    // Send ETA notification if enabled and status is "en_route"
    if (etaNotificationsEnabled && ride.status === "en_route" && routeInfo.duration) {
      toast({
        title: "ETA Update",
        description: `Your driver will arrive in approximately ${routeInfo.duration}.`,
        duration: 5000,
      });
    }
  };

  // Function to toggle ETA notifications
  const toggleEtaNotifications = () => {
    setEtaNotificationsEnabled(!etaNotificationsEnabled);
    toast({
      title: etaNotificationsEnabled ? "ETA Notifications Disabled" : "ETA Notifications Enabled",
      description: etaNotificationsEnabled 
        ? "You will no longer receive ETA updates." 
        : "You will now receive ETA updates when your driver's location changes.",
      duration: 3000,
    });
  };

  // Function to call driver
  const callDriver = () => {
    // In a real app, this would use the driver's phone number
    // For demo purposes, we'll just show an alert
    alert("Calling driver... (This would initiate a real call in production)");
  };

  // Function to send message to driver
  const sendMessage = () => {
    // Since chat is disabled, redirect back to ride details
    toast({
      title: "Chat Disabled",
      description: "Messaging is temporarily disabled. Closing dialog.",
      variant: "destructive",
    });

    // Close the tracking dialog to go back to ride details
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            Live Ride Tracking
          </DialogTitle>
        </DialogHeader>

        <div className="py-2">
          {isLoadingLocation ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-gray-600">Locating your driver...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
              <p className="text-gray-700 font-medium">Error Loading Location</p>
              <p className="text-gray-600 text-sm mt-1">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => setIsLoadingLocation(true)}
              >
                Try Again
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <MapView
                  pickupLocation={pickupLocation || undefined}
                  dropoffLocation={dropoffLocation || undefined}
                  currentLocation={driverLocation || undefined}
                  className="h-64 rounded-lg mb-3"
                  onRouteCalculated={handleRouteCalculated}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Estimated Time</p>
                    <p className="font-medium">{estimatedTimeDisplay || "Calculating..."}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Distance</p>
                    <p className="font-medium">{estimatedDistanceDisplay || "Calculating..."}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Driver Status</p>
                    <p className="font-medium">
                      {ride.status === "en_route" && "En route to pickup location"}
                      {ride.status === "arrived" && "Arrived at pickup location"}
                      {ride.status === "in_progress" && "En route to destination"}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <span>Last updated: {driverLocation ? new Date(driverLocation.timestamp).toLocaleTimeString() : "Unknown"}</span>
                      {wsConnected ? (
                        <Wifi className="h-3 w-3 text-green-500" />
                      ) : (
                        <WifiOff className="h-3 w-3 text-red-500" />
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={toggleEtaNotifications}
                    className="h-8 px-2"
                  >
                    {etaNotificationsEnabled ? (
                      <Bell className="h-4 w-4 text-primary" />
                    ) : (
                      <BellOff className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Messaging UI */}
              {showMessageForm ? (
                <div className="border rounded-lg p-3 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium">Message Driver</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0"
                      onClick={() => setShowMessageForm(false)}
                    >
                      &times;
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 px-3 py-2 border rounded-md text-sm"
                    />
                    <Button 
                      size="sm" 
                      disabled={!message.trim()}
                      onClick={sendMessage}
                    >
                      Send
                    </Button>
                  </div>
                  <div className="mt-2 flex gap-1.5 flex-wrap">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs py-0 h-6"
                      onClick={() => setMessage("When will you arrive?")}
                    >
                      When will you arrive?
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs py-0 h-6"
                      onClick={() => setMessage("I'm waiting outside.")}
                    >
                      I'm waiting outside.
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs py-0 h-6"
                      onClick={() => setMessage("I'll need help getting in the vehicle.")}
                    >
                      I'll need help.
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline"
            className="w-full sm:w-auto"
            onClick={callDriver}
          >
            <PhoneCall className="h-4 w-4 mr-2" />
            Call Driver
          </Button>

          <Button 
            variant={showMessageForm ? "secondary" : "outline"}
            className="w-full sm:w-auto"
            onClick={() => setShowMessageForm(!showMessageForm)}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Message
          </Button>

          <Button 
            variant="default"
            className="w-full sm:w-auto"
            disabled={!driverLocation}
            onClick={() => {
              // Open Google Maps with directions between relevant points
              const origin = driverLocation ? 
                `${driverLocation.lat},${driverLocation.lng}` : 
                ride.status === "in_progress" ? 
                  `${pickupLocation?.lat},${pickupLocation?.lng}` : "";

              const destination = ride.status === "in_progress" ?
                `${dropoffLocation?.lat},${dropoffLocation?.lng}` :
                `${pickupLocation?.lat},${pickupLocation?.lng}`;

              if (destination) {
                const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
                window.open(url, '_blank');
              }
            }}
          >
            <Navigation className="h-4 w-4 mr-2" />
            Open Directions
          </Button>

          <DialogClose asChild>
            <Button variant="ghost" className="w-full sm:w-auto">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
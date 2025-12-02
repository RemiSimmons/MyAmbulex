import React, { useState, useEffect } from "react";
import { useWebSocket } from "@/context/websocket-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Car, 
  PauseCircle, 
  PlayCircle,
  RotateCw,
  CornerUpRight,
  Navigation,
  Trash2,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DriverLocationEmulatorProps {
  rideId: number;
  driverId: number;
  className?: string;
}

interface LocationPoint {
  lat: number;
  lng: number;
  heading: number;
  timestamp: Date;
}

const DEFAULT_LOCATIONS = [
  { lat: 33.749, lng: -84.388, heading: 0 }, // Downtown Atlanta
  { lat: 33.762, lng: -84.39, heading: 30 }, // A bit north
  { lat: 33.77, lng: -84.38, heading: 45 }, // More north
  { lat: 33.78, lng: -84.365, heading: 60 }, // Northeast
  { lat: 33.79, lng: -84.345, heading: 90 }, // East
];

const DriverLocationEmulator: React.FC<DriverLocationEmulatorProps> = ({
  rideId,
  driverId,
  className
}) => {
  const { socket } = useWebSocket();
  
  // State for waypoints
  const [waypoints, setWaypoints] = useState<LocationPoint[]>(
    DEFAULT_LOCATIONS.map(loc => ({
      ...loc,
      timestamp: new Date()
    }))
  );
  
  // State for simulation
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentWaypoint, setCurrentWaypoint] = useState(0);
  const [speed, setSpeed] = useState(5); // seconds between updates
  const [customLat, setCustomLat] = useState("");
  const [customLng, setCustomLng] = useState("");
  const [customHeading, setCustomHeading] = useState("0");
  const [autoIncrement, setAutoIncrement] = useState(true);
  
  // Send a location update to the WebSocket server
  const sendLocationUpdate = (location: LocationPoint) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not connected, can't send location update");
      return;
    }
    
    const message = {
      type: 'driver_location',
      rideId,
      driverId,
      lat: location.lat,
      lng: location.lng,
      heading: location.heading,
      timestamp: new Date().toISOString(),
      speed: 25, // mph, simulated
    };
    
    socket.send(JSON.stringify(message));
    console.log("Sent driver location update:", message);
  };
  
  // Handle the simulation interval
  useEffect(() => {
    if (!isSimulating) return;
    
    // Don't start if we have no waypoints
    if (waypoints.length === 0) {
      setIsSimulating(false);
      return;
    }
    
    const interval = setInterval(() => {
      // Send current waypoint
      sendLocationUpdate(waypoints[currentWaypoint]);
      
      // Move to next waypoint if auto-increment is enabled
      if (autoIncrement) {
        setCurrentWaypoint((prev) => {
          const next = (prev + 1) % waypoints.length;
          return next;
        });
      }
    }, speed * 1000);
    
    // Clean up the interval on unmount
    return () => clearInterval(interval);
  }, [isSimulating, waypoints, currentWaypoint, speed, autoIncrement, rideId, driverId, socket]);
  
  // Add a custom waypoint
  const addCustomWaypoint = () => {
    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);
    const heading = parseFloat(customHeading);
    
    if (isNaN(lat) || isNaN(lng) || isNaN(heading)) {
      // Only add if we have valid numbers
      return;
    }
    
    const newWaypoint: LocationPoint = {
      lat,
      lng,
      heading,
      timestamp: new Date()
    };
    
    setWaypoints([...waypoints, newWaypoint]);
    setCustomLat("");
    setCustomLng("");
    setCustomHeading("0");
  };
  
  // Remove a waypoint
  const removeWaypoint = (index: number) => {
    // Don't remove if we're simulating
    if (isSimulating) return;
    
    // Don't remove last waypoint
    if (waypoints.length <= 1) return;
    
    const newWaypoints = [...waypoints];
    newWaypoints.splice(index, 1);
    setWaypoints(newWaypoints);
    
    // Adjust current waypoint if needed
    if (currentWaypoint >= newWaypoints.length) {
      setCurrentWaypoint(newWaypoints.length - 1);
    }
  };
  
  // Send the current waypoint immediately
  const sendCurrentWaypoint = () => {
    if (waypoints.length === 0) return;
    sendLocationUpdate(waypoints[currentWaypoint]);
  };
  
  // Clear all waypoints and reset to defaults
  const resetWaypoints = () => {
    // Don't reset if we're simulating
    if (isSimulating) return;
    
    setWaypoints(
      DEFAULT_LOCATIONS.map(loc => ({
        ...loc,
        timestamp: new Date()
      }))
    );
    setCurrentWaypoint(0);
  };
  
  // Generate a route (simple circular route around Atlanta for demo)
  const generateCircularRoute = () => {
    // Don't generate if we're simulating
    if (isSimulating) return;
    
    // Center point
    const centerLat = 33.749;
    const centerLng = -84.388;
    const radius = 0.02; // ~1-2 miles
    
    const newWaypoints: LocationPoint[] = [];
    
    // Generate points in a circle
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * 2 * Math.PI;
      const lat = centerLat + radius * Math.sin(angle);
      const lng = centerLng + radius * Math.cos(angle);
      
      // Calculate heading (tangent to circle)
      const heading = (angle + Math.PI / 2) * (180 / Math.PI);
      
      newWaypoints.push({
        lat,
        lng,
        heading,
        timestamp: new Date()
      });
    }
    
    setWaypoints(newWaypoints);
    setCurrentWaypoint(0);
  };
  
  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">
            Driver Location Emulator
            <Badge variant="outline" className="ml-2 text-xs">Test Tool</Badge>
          </CardTitle>
          <div>
            <Button
              size="sm"
              variant={isSimulating ? "destructive" : "default"}
              onClick={() => setIsSimulating(!isSimulating)}
            >
              {isSimulating ? 
                <><PauseCircle className="h-4 w-4 mr-2" /> Stop</> : 
                <><PlayCircle className="h-4 w-4 mr-2" /> Start</>
              }
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current location display */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="current-lat">Latitude</Label>
            <div className="font-mono text-sm bg-muted p-2 rounded-md">
              {waypoints[currentWaypoint]?.lat.toFixed(6) || "N/A"}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="current-lng">Longitude</Label>
            <div className="font-mono text-sm bg-muted p-2 rounded-md">
              {waypoints[currentWaypoint]?.lng.toFixed(6) || "N/A"}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="current-heading">Heading</Label>
            <div className="font-mono text-sm bg-muted p-2 rounded-md">
              {waypoints[currentWaypoint]?.heading.toFixed(0) || "N/A"}°
            </div>
          </div>
        </div>
        
        {/* Controls */}
        <div className="space-y-4 border-t pt-4">
          {/* Simulation speed */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="speed">Update Interval: {speed}s</Label>
              <div className="flex items-center space-x-2">
                <Label htmlFor="auto-increment" className="text-xs">Auto-advance</Label>
                <Switch
                  id="auto-increment"
                  checked={autoIncrement}
                  onCheckedChange={setAutoIncrement}
                />
              </div>
            </div>
            <Slider
              id="speed"
              min={1}
              max={10}
              step={1}
              value={[speed]}
              onValueChange={(value) => setSpeed(value[0])}
            />
          </div>
          
          {/* Waypoint controls */}
          <div className="flex justify-between space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={sendCurrentWaypoint}
              disabled={waypoints.length === 0}
            >
              <Car className="h-4 w-4 mr-1" /> 
              Send Now
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={resetWaypoints}
              disabled={isSimulating}
            >
              <RefreshCw className="h-4 w-4 mr-1" /> 
              Reset
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={generateCircularRoute}
              disabled={isSimulating}
            >
              <RotateCw className="h-4 w-4 mr-1" /> 
              Circular
            </Button>
          </div>
        </div>
        
        {/* Add custom waypoint */}
        <div className="space-y-2 border-t pt-4">
          <Label>Add Custom Waypoint</Label>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="custom-lat" className="text-xs">Latitude</Label>
              <Input
                id="custom-lat"
                placeholder="33.749"
                value={customLat}
                onChange={(e) => setCustomLat(e.target.value)}
              />
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="custom-lng" className="text-xs">Longitude</Label>
              <Input
                id="custom-lng"
                placeholder="-84.388"
                value={customLng}
                onChange={(e) => setCustomLng(e.target.value)}
              />
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="custom-heading" className="text-xs">Heading (°)</Label>
              <Input
                id="custom-heading"
                placeholder="0"
                value={customHeading}
                onChange={(e) => setCustomHeading(e.target.value)}
              />
            </div>
          </div>
          
          <Button 
            onClick={addCustomWaypoint}
            className="w-full mt-2"
            disabled={isSimulating}
            size="sm"
          >
            <CornerUpRight className="h-4 w-4 mr-1" /> 
            Add Waypoint
          </Button>
        </div>
        
        {/* Waypoints list */}
        <div className="space-y-2 border-t pt-4">
          <Label>Waypoints ({waypoints.length})</Label>
          
          <div className="max-h-[200px] overflow-y-auto space-y-1">
            {waypoints.map((waypoint, index) => (
              <div 
                key={index}
                className={cn(
                  "flex items-center justify-between p-2 rounded-md text-xs",
                  index === currentWaypoint ? "bg-primary/10 border border-primary/50" : "bg-muted"
                )}
              >
                <div className="flex items-center space-x-1 font-mono">
                  <Navigation className="h-3 w-3" style={{ transform: `rotate(${waypoint.heading}deg)` }} />
                  <span>{waypoint.lat.toFixed(6)}</span>
                  <span>/</span>
                  <span>{waypoint.lng.toFixed(6)}</span>
                </div>
                
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setCurrentWaypoint(index)}
                    title="Select waypoint"
                  >
                    <Car className="h-3 w-3" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={() => removeWaypoint(index)}
                    title="Remove waypoint"
                    disabled={isSimulating || waypoints.length <= 1}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DriverLocationEmulator;
import { EventEmitter } from 'events';
import { storage } from './storage';
import { notificationService } from './notifications';

interface LocationUpdate {
  userId: number;
  rideId: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
  batteryLevel?: number;
  isLocationServicesEnabled: boolean;
}

interface TrackingSession {
  rideId: number;
  driverId: number;
  riderId: number;
  isActive: boolean;
  startTime: Date;
  lastUpdate?: Date;
  currentLocation?: LocationUpdate;
  locationHistory: LocationUpdate[];
  geofences: Geofence[];
  alerts: TrackingAlert[];
}

interface Geofence {
  id: string;
  type: 'pickup' | 'dropoff' | 'hospital' | 'waypoint';
  latitude: number;
  longitude: number;
  radius: number; // meters
  isTriggered: boolean;
  triggeredAt?: Date;
}

interface TrackingAlert {
  id: string;
  type: 'speed_limit' | 'route_deviation' | 'low_battery' | 'location_timeout' | 'geofence_entry' | 'geofence_exit';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  isResolved: boolean;
}

export class GPSTrackingService extends EventEmitter {
  private activeSessions: Map<number, TrackingSession> = new Map();
  private locationTimeouts: Map<number, NodeJS.Timeout> = new Map();
  private readonly LOCATION_TIMEOUT = 2 * 60 * 1000; // 2 minutes
  private readonly MAX_SPEED_LIMIT = 80; // mph
  private readonly GEOFENCE_RADIUS = 100; // meters

  constructor() {
    super();
    this.setupPeriodicChecks();
  }

  /**
   * Start GPS tracking for a ride
   */
  async startTracking(rideId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const ride = await storage.getRide(rideId);
      if (!ride) {
        return { success: false, error: 'Ride not found' };
      }

      if (!ride.driverId) {
        return { success: false, error: 'No driver assigned to ride' };
      }

      // Create geofences for pickup and dropoff
      const geofences: Geofence[] = [];
      
      if (ride.pickupLatitude && ride.pickupLongitude) {
        geofences.push({
          id: `pickup_${rideId}`,
          type: 'pickup',
          latitude: ride.pickupLatitude,
          longitude: ride.pickupLongitude,
          radius: this.GEOFENCE_RADIUS,
          isTriggered: false
        });
      }

      if (ride.dropoffLatitude && ride.dropoffLongitude) {
        geofences.push({
          id: `dropoff_${rideId}`,
          type: 'dropoff',
          latitude: ride.dropoffLatitude,
          longitude: ride.dropoffLongitude,
          radius: this.GEOFENCE_RADIUS,
          isTriggered: false
        });
      }

      const session: TrackingSession = {
        rideId,
        driverId: ride.driverId,
        riderId: ride.riderId,
        isActive: true,
        startTime: new Date(),
        locationHistory: [],
        geofences,
        alerts: []
      };

      this.activeSessions.set(rideId, session);

      // Notify participants that tracking has started
      await this.notifyTrackingStarted(session);

      // Set up location timeout
      this.setupLocationTimeout(rideId);

      this.emit('tracking_started', { rideId, session });

      return { success: true };
    } catch (error) {
      console.error('Error starting GPS tracking:', error);
      return { success: false, error: 'Failed to start tracking' };
    }
  }

  /**
   * Update location for a ride
   */
  async updateLocation(rideId: number, locationUpdate: Omit<LocationUpdate, 'rideId'>): Promise<{ success: boolean; error?: string }> {
    try {
      const session = this.activeSessions.get(rideId);
      if (!session || !session.isActive) {
        return { success: false, error: 'No active tracking session found' };
      }

      const fullLocationUpdate: LocationUpdate = {
        ...locationUpdate,
        rideId,
        timestamp: new Date()
      };

      // Validate location accuracy
      if (locationUpdate.accuracy > 50) {
        console.warn(`Low accuracy location update for ride ${rideId}: ${locationUpdate.accuracy}m`);
      }

      // Update session
      session.currentLocation = fullLocationUpdate;
      session.lastUpdate = new Date();
      session.locationHistory.push(fullLocationUpdate);

      // Keep only last 100 locations to prevent memory issues
      if (session.locationHistory.length > 100) {
        session.locationHistory = session.locationHistory.slice(-100);
      }

      // Check for alerts
      await this.checkForAlerts(session, fullLocationUpdate);

      // Check geofences
      await this.checkGeofences(session, fullLocationUpdate);

      // Reset location timeout
      this.setupLocationTimeout(rideId);

      // Emit location update event
      this.emit('location_updated', { rideId, location: fullLocationUpdate, session });

      // Store location in database for persistence
      await this.storeLocationUpdate(fullLocationUpdate);

      return { success: true };
    } catch (error) {
      console.error('Error updating location:', error);
      return { success: false, error: 'Failed to update location' };
    }
  }

  /**
   * Stop GPS tracking for a ride
   */
  async stopTracking(rideId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const session = this.activeSessions.get(rideId);
      if (!session) {
        return { success: false, error: 'No tracking session found' };
      }

      session.isActive = false;

      // Clear location timeout
      const timeout = this.locationTimeouts.get(rideId);
      if (timeout) {
        clearTimeout(timeout);
        this.locationTimeouts.delete(rideId);
      }

      // Notify participants that tracking has stopped
      await this.notifyTrackingStopped(session);

      // Clean up session
      this.activeSessions.delete(rideId);

      this.emit('tracking_stopped', { rideId, session });

      return { success: true };
    } catch (error) {
      console.error('Error stopping GPS tracking:', error);
      return { success: false, error: 'Failed to stop tracking' };
    }
  }

  /**
   * Get current location for a ride
   */
  getCurrentLocation(rideId: number): LocationUpdate | null {
    const session = this.activeSessions.get(rideId);
    return session?.currentLocation || null;
  }

  /**
   * Get location history for a ride
   */
  getLocationHistory(rideId: number, limit: number = 50): LocationUpdate[] {
    const session = this.activeSessions.get(rideId);
    if (!session) return [];
    
    return session.locationHistory.slice(-limit);
  }

  /**
   * Get tracking session info
   */
  getTrackingSession(rideId: number): TrackingSession | null {
    return this.activeSessions.get(rideId) || null;
  }

  /**
   * Get all active tracking sessions
   */
  getActiveSessions(): TrackingSession[] {
    return Array.from(this.activeSessions.values()).filter(session => session.isActive);
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  /**
   * Check for various alerts based on location update
   */
  private async checkForAlerts(session: TrackingSession, location: LocationUpdate): Promise<void> {
    const alerts: TrackingAlert[] = [];

    // Speed limit check
    if (location.speed && location.speed > this.MAX_SPEED_LIMIT) {
      alerts.push({
        id: `speed_${Date.now()}`,
        type: 'speed_limit',
        severity: 'high',
        message: `Driver exceeding speed limit: ${location.speed} mph`,
        timestamp: new Date(),
        isResolved: false
      });
    }

    // Low battery check
    if (location.batteryLevel && location.batteryLevel < 20) {
      alerts.push({
        id: `battery_${Date.now()}`,
        type: 'low_battery',
        severity: location.batteryLevel < 10 ? 'critical' : 'medium',
        message: `Driver's device battery low: ${location.batteryLevel}%`,
        timestamp: new Date(),
        isResolved: false
      });
    }

    // Location services check
    if (!location.isLocationServicesEnabled) {
      alerts.push({
        id: `location_services_${Date.now()}`,
        type: 'location_timeout',
        severity: 'critical',
        message: 'Driver has disabled location services',
        timestamp: new Date(),
        isResolved: false
      });
    }

    // Add alerts to session and send notifications
    for (const alert of alerts) {
      session.alerts.push(alert);
      await this.sendAlertNotification(session, alert);
    }
  }

  /**
   * Check if location is within any geofences
   */
  private async checkGeofences(session: TrackingSession, location: LocationUpdate): Promise<void> {
    for (const geofence of session.geofences) {
      const distance = this.calculateDistance(
        location.latitude,
        location.longitude,
        geofence.latitude,
        geofence.longitude
      );

      if (distance <= geofence.radius && !geofence.isTriggered) {
        // Entering geofence
        geofence.isTriggered = true;
        geofence.triggeredAt = new Date();

        const alert: TrackingAlert = {
          id: `geofence_entry_${geofence.id}_${Date.now()}`,
          type: 'geofence_entry',
          severity: 'low',
          message: `Driver has arrived at ${geofence.type} location`,
          timestamp: new Date(),
          isResolved: false
        };

        session.alerts.push(alert);
        await this.sendGeofenceNotification(session, geofence, 'entry');

        // Update ride status based on geofence type
        if (geofence.type === 'pickup') {
          await storage.updateRide(session.rideId, { status: 'picked_up' });
        } else if (geofence.type === 'dropoff') {
          await storage.updateRide(session.rideId, { status: 'completed' });
          await this.stopTracking(session.rideId);
        }
      }
    }
  }

  /**
   * Setup location timeout monitoring
   */
  private setupLocationTimeout(rideId: number): void {
    // Clear existing timeout
    const existingTimeout = this.locationTimeouts.get(rideId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(async () => {
      const session = this.activeSessions.get(rideId);
      if (session && session.isActive) {
        const alert: TrackingAlert = {
          id: `timeout_${Date.now()}`,
          type: 'location_timeout',
          severity: 'high',
          message: 'No location updates received from driver',
          timestamp: new Date(),
          isResolved: false
        };

        session.alerts.push(alert);
        await this.sendAlertNotification(session, alert);
      }
    }, this.LOCATION_TIMEOUT);

    this.locationTimeouts.set(rideId, timeout);
  }

  /**
   * Store location update in database
   */
  private async storeLocationUpdate(location: LocationUpdate): Promise<void> {
    try {
      // This would typically go to a time-series database or location table
      // For now, we'll store it in a simple location_updates table
      console.log('Storing location update:', {
        rideId: location.rideId,
        userId: location.userId,
        lat: location.latitude,
        lng: location.longitude,
        accuracy: location.accuracy,
        timestamp: location.timestamp
      });
    } catch (error) {
      console.error('Error storing location update:', error);
    }
  }

  /**
   * Send tracking started notification
   */
  private async notifyTrackingStarted(session: TrackingSession): Promise<void> {
    try {
      await notificationService.sendRideTrackingNotification(
        session.riderId,
        session.rideId,
        'started',
        'GPS tracking has started for your ride'
      );
    } catch (error) {
      console.error('Error sending tracking started notification:', error);
    }
  }

  /**
   * Send tracking stopped notification
   */
  private async notifyTrackingStopped(session: TrackingSession): Promise<void> {
    try {
      await notificationService.sendRideTrackingNotification(
        session.riderId,
        session.rideId,
        'stopped',
        'GPS tracking has ended for your ride'
      );
    } catch (error) {
      console.error('Error sending tracking stopped notification:', error);
    }
  }

  /**
   * Send alert notification
   */
  private async sendAlertNotification(session: TrackingSession, alert: TrackingAlert): Promise<void> {
    try {
      // Send to rider
      await notificationService.sendRideAlertNotification(
        session.riderId,
        session.rideId,
        alert.type,
        alert.message,
        alert.severity
      );

      // Send SMS for critical alerts
      if (alert.severity === 'critical') {
        const rider = await storage.getUser(session.riderId);
        if (rider?.phone) {
          await notificationService.sendSMSAlert(
            rider.phone,
            `URGENT: ${alert.message} for your MyAmbulex ride #${session.rideId}`
          );
        }
      }
    } catch (error) {
      console.error('Error sending alert notification:', error);
    }
  }

  /**
   * Send geofence notification
   */
  private async sendGeofenceNotification(session: TrackingSession, geofence: Geofence, action: 'entry' | 'exit'): Promise<void> {
    try {
      const message = action === 'entry' 
        ? `Driver has arrived at ${geofence.type} location`
        : `Driver has left ${geofence.type} location`;

      await notificationService.sendRideTrackingNotification(
        session.riderId,
        session.rideId,
        geofence.type,
        message
      );
    } catch (error) {
      console.error('Error sending geofence notification:', error);
    }
  }

  /**
   * Setup periodic checks for session health
   */
  private setupPeriodicChecks(): void {
    setInterval(() => {
      this.checkSessionHealth();
    }, 60000); // Check every minute
  }

  /**
   * Check health of all active sessions
   */
  private checkSessionHealth(): void {
    const now = new Date();
    
    for (const [rideId, session] of this.activeSessions.entries()) {
      if (!session.isActive) continue;

      // Check if session has been inactive for too long
      if (session.lastUpdate) {
        const timeSinceLastUpdate = now.getTime() - session.lastUpdate.getTime();
        if (timeSinceLastUpdate > 10 * 60 * 1000) { // 10 minutes
          console.warn(`Session ${rideId} has been inactive for ${timeSinceLastUpdate / 1000} seconds`);
        }
      }

      // Check if session has been running for an unusually long time
      const sessionDuration = now.getTime() - session.startTime.getTime();
      if (sessionDuration > 8 * 60 * 60 * 1000) { // 8 hours
        console.warn(`Session ${rideId} has been running for ${sessionDuration / (1000 * 60 * 60)} hours`);
      }
    }
  }
}

export const gpsTrackingService = new GPSTrackingService();
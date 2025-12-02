/**
 * Coordinate Validation Utility
 * Provides clean validation and error handling for geographic coordinates
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedCoordinates?: Coordinates;
}

export interface DistanceCalculationResult {
  success: boolean;
  distance?: number;
  error?: string;
}

/**
 * Comprehensive coordinate validator for medical transport
 */
export class CoordinateValidator {
  // Continental US bounds (including Alaska and Hawaii)
  private static readonly US_BOUNDS = {
    north: 71.5,  // Northern Alaska
    south: 18.9,  // Southern Hawaii
    east: -66.9,  // Eastern Maine
    west: -179.1  // Western Alaska (crosses date line)
  };

  // Reasonable distance limits for medical transport
  private static readonly DISTANCE_LIMITS = {
    min: 0.1,   // 0.1 miles minimum
    max: 1000   // 1000 miles maximum (cross-country)
  };

  /**
   * Validate coordinates are within continental US bounds
   */
  static validateUSCoordinates(coordinates: Coordinates): ValidationResult {
    const { lat, lng } = coordinates;

    // Basic numeric validation
    if (!this.isValidNumber(lat) || !this.isValidNumber(lng)) {
      return {
        isValid: false,
        error: "Invalid coordinate format"
      };
    }

    // Check latitude bounds
    if (lat < -90 || lat > 90) {
      return {
        isValid: false,
        error: "Latitude out of valid range"
      };
    }

    // Check longitude bounds
    if (lng < -180 || lng > 180) {
      return {
        isValid: false,
        error: "Longitude out of valid range"
      };
    }

    // Check if coordinates are within US territory
    if (!this.isWithinUSBounds(coordinates)) {
      return {
        isValid: false,
        error: "Location outside US service area"
      };
    }

    // Check for common invalid fallback coordinates
    if (this.isCommonFallbackCoordinate(coordinates)) {
      return {
        isValid: false,
        error: "Invalid location coordinates detected"
      };
    }

    return {
      isValid: true,
      sanitizedCoordinates: {
        lat: Math.round(lat * 1000000) / 1000000, // 6 decimal places
        lng: Math.round(lng * 1000000) / 1000000
      }
    };
  }

  /**
   * Calculate distance with comprehensive validation
   */
  static calculateValidatedDistance(
    pickup: Coordinates,
    dropoff: Coordinates
  ): DistanceCalculationResult {
    // Validate pickup coordinates
    const pickupValidation = this.validateUSCoordinates(pickup);
    if (!pickupValidation.isValid) {
      return {
        success: false,
        error: `Pickup location: ${pickupValidation.error}`
      };
    }

    // Validate dropoff coordinates
    const dropoffValidation = this.validateUSCoordinates(dropoff);
    if (!dropoffValidation.isValid) {
      return {
        success: false,
        error: `Destination: ${dropoffValidation.error}`
      };
    }

    try {
      // Use Haversine formula for distance calculation
      const distance = this.calculateHaversineDistance(
        pickupValidation.sanitizedCoordinates!,
        dropoffValidation.sanitizedCoordinates!
      );

      // Validate calculated distance
      if (!this.isValidDistance(distance)) {
        return {
          success: false,
          error: "Calculated distance outside reasonable limits"
        };
      }

      return {
        success: true,
        distance: Math.round(distance * 100) / 100 // Round to 2 decimal places
      };
    } catch (error) {
      return {
        success: false,
        error: "Unable to calculate distance at this time"
      };
    }
  }

  /**
   * Check if coordinate is a valid number
   */
  private static isValidNumber(value: any): boolean {
    return typeof value === 'number' && 
           !isNaN(value) && 
           isFinite(value);
  }

  /**
   * Check if coordinates are within US bounds
   */
  private static isWithinUSBounds(coordinates: Coordinates): boolean {
    const { lat, lng } = coordinates;
    
    // Handle Alaska longitude crossing date line
    const isInAlaska = lat >= 51.0 && lat <= 71.5 && 
                       ((lng >= -179.1 && lng <= -129.0) || (lng >= 172.0 && lng <= 180.0));
    
    // Handle Hawaii
    const isInHawaii = lat >= 18.9 && lat <= 28.5 && lng >= -178.0 && lng <= -154.0;
    
    // Handle continental US
    const isInContinental = lat >= 24.0 && lat <= 49.5 && lng >= -125.0 && lng <= -66.9;

    return isInAlaska || isInHawaii || isInContinental;
  }

  /**
   * Check for common invalid fallback coordinates
   */
  private static isCommonFallbackCoordinate(coordinates: Coordinates): boolean {
    const { lat, lng } = coordinates;
    
    // Common fallback coordinates to reject
    const fallbackCoords = [
      { lat: 0, lng: 0 },     // Null Island
      { lat: 1, lng: 1 },     // Common default
      { lat: 90, lng: 0 },    // North Pole
      { lat: -90, lng: 0 },   // South Pole
    ];

    return fallbackCoords.some(fallback => 
      Math.abs(lat - fallback.lat) < 0.001 && 
      Math.abs(lng - fallback.lng) < 0.001
    );
  }

  /**
   * Calculate distance using Haversine formula
   */
  private static calculateHaversineDistance(
    coord1: Coordinates,
    coord2: Coordinates
  ): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(coord2.lat - coord1.lat);
    const dLng = this.toRadians(coord2.lng - coord1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(coord1.lat)) * 
              Math.cos(this.toRadians(coord2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Check if distance is within reasonable limits
   */
  private static isValidDistance(distance: number): boolean {
    return distance >= this.DISTANCE_LIMITS.min && 
           distance <= this.DISTANCE_LIMITS.max;
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyError(error: string): string {
    const errorMap: Record<string, string> = {
      "Invalid coordinate format": "Please select a valid address from the suggestions",
      "Location outside US service area": "Service is currently available within the United States only",
      "Invalid location coordinates detected": "Please select a different address",
      "Calculated distance outside reasonable limits": "Distance too far for our service area",
      "Unable to calculate distance at this time": "We cannot process this request at this time"
    };

    return errorMap[error] || "We cannot process this request at this time";
  }
}
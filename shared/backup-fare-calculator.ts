/**
 * Backup Fare Calculator
 * Provides fallback calculation when Google Maps API fails
 */

import { CoordinateValidator, type Coordinates } from './coordinate-validator';

export interface BackupFareParams {
  pickup: Coordinates;
  dropoff: Coordinates;
  vehicleType: 'standard' | 'wheelchair' | 'stretcher';
  additionalServices?: {
    needsRamp?: boolean;
    needsCompanion?: boolean;
    needsStairChair?: boolean;
    needsWaitTime?: boolean;
  };
  isRoundTrip?: boolean;
}

export interface BackupFareResult {
  success: boolean;
  distance?: number;
  estimatedFare?: number;
  breakdown?: {
    baseFare: number;
    distanceFare: number;
    vehicleTypePremium: number;
    servicesFee: number;
    subtotal: number;
    platformFee: number;
    tax: number;
    total: number;
  };
  error?: string;
}

/**
 * Simplified fare calculator that works without external APIs
 */
export class BackupFareCalculator {
  private static readonly BASE_FARES = {
    standard: 45,
    wheelchair: 70,
    stretcher: 95
  };

  private static readonly DISTANCE_RATE = 2.50;
  private static readonly PLATFORM_FEE_RATE = 0.05;
  private static readonly TAX_RATE = 0.08;

  private static readonly SERVICE_FEES = {
    ramp: 15,
    companion: 20,
    stairChair: 30,
    waitTime: 35
  };

  /**
   * Calculate fare using backup method
   */
  static calculateBackupFare(params: BackupFareParams): BackupFareResult {
    try {
      // Validate coordinates and calculate distance
      const distanceResult = CoordinateValidator.calculateValidatedDistance(
        params.pickup,
        params.dropoff
      );

      if (!distanceResult.success || !distanceResult.distance) {
        return {
          success: false,
          error: distanceResult.error || "Unable to calculate distance"
        };
      }

      const distance = distanceResult.distance;

      // Calculate fare components
      const baseFare = this.BASE_FARES[params.vehicleType];
      const distanceFare = distance * this.DISTANCE_RATE;
      const vehicleTypePremium = 0; // Already included in base fare

      // Calculate additional services
      let servicesFee = 0;
      if (params.additionalServices) {
        const services = params.additionalServices;
        if (services.needsRamp) servicesFee += this.SERVICE_FEES.ramp;
        if (services.needsCompanion) servicesFee += this.SERVICE_FEES.companion;
        if (services.needsStairChair) servicesFee += this.SERVICE_FEES.stairChair;
        if (services.needsWaitTime) servicesFee += this.SERVICE_FEES.waitTime;
      }

      // Calculate subtotal
      let subtotal = baseFare + distanceFare + vehicleTypePremium + servicesFee;

      // Apply round trip discount
      if (params.isRoundTrip) {
        subtotal = subtotal * 0.95; // 5% discount
      }

      // Calculate platform fee and tax
      const platformFee = subtotal * this.PLATFORM_FEE_RATE;
      const subtotalWithPlatformFee = subtotal + platformFee;
      const tax = subtotalWithPlatformFee * this.TAX_RATE;
      const total = subtotalWithPlatformFee + tax;

      return {
        success: true,
        distance,
        estimatedFare: Math.round(total * 100) / 100,
        breakdown: {
          baseFare,
          distanceFare: Math.round(distanceFare * 100) / 100,
          vehicleTypePremium,
          servicesFee,
          subtotal: Math.round(subtotal * 100) / 100,
          platformFee: Math.round(platformFee * 100) / 100,
          tax: Math.round(tax * 100) / 100,
          total: Math.round(total * 100) / 100
        }
      };
    } catch (error) {
      return {
        success: false,
        error: "Unable to calculate fare at this time"
      };
    }
  }

  /**
   * Get estimated duration based on distance
   */
  static estimateDuration(distance: number): string {
    // Assume average speed of 30 mph for medical transport
    const durationMinutes = Math.round((distance / 30) * 60);
    
    if (durationMinutes < 60) {
      return `${durationMinutes} min`;
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
  }

  /**
   * Format distance for display
   */
  static formatDistance(distance: number): string {
    return `${distance.toFixed(1)} mi`;
  }
}
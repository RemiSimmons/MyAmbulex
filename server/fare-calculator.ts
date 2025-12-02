import { Ride } from '@shared/schema';
import { CoordinateValidator } from '@shared/coordinate-validator';
import { storage } from './storage';

export interface FareCalculationParams {
  estimatedDistance?: number;
  estimatedDuration?: number;
  vehicleType: 'standard' | 'wheelchair' | 'stretcher';
  pickupStairs?: string;
  dropoffStairs?: string;
  needsRamp?: boolean;
  needsCompanion?: boolean;
  needsStairChair?: boolean;
  needsWaitTime?: boolean;
  isRoundTrip?: boolean;
  isRecurring?: boolean;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek?: 'weekday' | 'weekend';
  urgency?: 'standard' | 'urgent' | 'emergency';
  specialNeeds?: string[];
}

export interface FareBreakdown {
  baseFare: number;
  distanceFare: number;
  vehicleTypePremium: number;
  stairsFee: number;
  servicesFee: number;
  timePremium: number;
  urgencyPremium: number;
  subtotal: number;
  platformFee: number;
  tax: number;
  total: number;
  suggestedBidRange: {
    min: number;
    max: number;
  };
}

export class FareCalculator {
  // Base pricing structure
  private baseFare = 45; // Base fare for all rides
  private distanceRate = 2.50; // Per mile
  private timeRate = 0.75; // Per minute
  private taxRate = 0.08; // 8% tax
  private defaultPlatformFeeRate = 0.05; // 5% default platform fee

  // Vehicle type premiums
  private vehiclePremiums = {
    standard: 0,
    wheelchair: 25,
    stretcher: 50
  };

  // Stairs fees
  private stairsFees = {
    none: 0,
    '1-3': 8,
    '4-10': 15,
    '11+': 25,
    'full_flight': 35
  };

  // Service fees
  private serviceFees = {
    ramp: 15,
    companion: 20,
    stairChair: 30,
    waitTime: 35
  };

  // Time-based premiums (multipliers)
  private timePremiums = {
    morning: 1.0,   // 6 AM - 12 PM
    afternoon: 1.0, // 12 PM - 6 PM
    evening: 1.1,   // 6 PM - 10 PM
    night: 1.25     // 10 PM - 6 AM
  };

  // Day-based premiums
  private dayPremiums = {
    weekday: 1.0,
    weekend: 1.15
  };

  // Urgency premiums
  private urgencyPremiums = {
    standard: 1.0,
    urgent: 1.25,
    emergency: 1.5
  };

  /**
   * Get platform fee percentage from settings (default 5%)
   */
  private async getPlatformFeeRate(): Promise<number> {
    try {
      const setting = await storage.getPlatformSetting('platform_fee_percentage');
      return setting ? parseFloat(setting.value) / 100 : this.defaultPlatformFeeRate;
    } catch (error) {
      console.error('Error getting platform fee rate:', error);
      return this.defaultPlatformFeeRate;
    }
  }

  /**
   * Calculate comprehensive fare for a ride
   */
  async calculateFare(params: FareCalculationParams): Promise<FareBreakdown> {
    // Use coordinate validator for robust distance validation
    let validDistance = 0;
    
    if (params.estimatedDistance) {
      if (isNaN(params.estimatedDistance) || params.estimatedDistance < 0.1 || params.estimatedDistance > 1000) {
        console.error("Invalid distance in fare calculation:", params.estimatedDistance);
        throw new Error("We cannot process this request at this time");
      }
      validDistance = params.estimatedDistance;
    }

    // Base fare
    let baseFare = this.baseFare;

    // Distance-based fare
    const distanceFare = validDistance * this.distanceRate;
    
    console.log("Fare calculation:", {
      inputDistance: params.estimatedDistance,
      validDistance,
      distanceFare,
      distanceRate: this.distanceRate
    });

    // Vehicle type premium
    const vehicleTypePremium = this.vehiclePremiums[params.vehicleType] || 0;

    // Stairs fees
    let stairsFee = 0;
    if (params.pickupStairs && params.pickupStairs !== 'none') {
      stairsFee += this.stairsFees[params.pickupStairs as keyof typeof this.stairsFees] || 0;
    }
    if (params.dropoffStairs && params.dropoffStairs !== 'none') {
      stairsFee += this.stairsFees[params.dropoffStairs as keyof typeof this.stairsFees] || 0;
    }

    // Additional services fees
    let servicesFee = 0;
    if (params.needsRamp) servicesFee += this.serviceFees.ramp;
    if (params.needsCompanion) servicesFee += this.serviceFees.companion;
    if (params.needsStairChair) servicesFee += this.serviceFees.stairChair;
    if (params.needsWaitTime) servicesFee += this.serviceFees.waitTime;

    // Calculate subtotal before premiums
    let subtotal = baseFare + distanceFare + vehicleTypePremium + stairsFee + servicesFee;

    // Apply time-based premium
    const timePremium = params.timeOfDay ? this.timePremiums[params.timeOfDay] : 1.0;
    const dayPremium = params.dayOfWeek ? this.dayPremiums[params.dayOfWeek] : 1.0;
    const urgencyPremium = params.urgency ? this.urgencyPremiums[params.urgency] : 1.0;

    // Calculate premium multiplier
    const combinedPremium = timePremium * dayPremium * urgencyPremium;
    const premiumAmount = subtotal * (combinedPremium - 1);

    // Apply round trip discount (10% off return journey)
    if (params.isRoundTrip) {
      subtotal = subtotal * 0.95; // 5% discount for round trip
    }

    // Apply recurring appointment discount (5% off)
    if (params.isRecurring) {
      subtotal = subtotal * 0.95;
    }

    // Final subtotal with premiums
    subtotal = subtotal + premiumAmount;

    // Calculate platform fee (configurable percentage of subtotal including all additional options)
    const platformFeeRate = await this.getPlatformFeeRate();
    const platformFee = subtotal * platformFeeRate;

    // Add platform fee to subtotal for tax calculation
    const subtotalWithPlatformFee = subtotal + platformFee;

    // Calculate tax on subtotal + platform fee
    const tax = subtotalWithPlatformFee * this.taxRate;

    // Final total includes subtotal + platform fee + tax
    const total = subtotalWithPlatformFee + tax;

    // Calculate suggested bid range (70% to 130% of calculated fare)
    const suggestedBidRange = {
      min: Math.floor(total * 0.70),
      max: Math.ceil(total * 1.30)
    };

    return {
      baseFare,
      distanceFare,
      vehicleTypePremium,
      stairsFee,
      servicesFee,
      timePremium: premiumAmount,
      urgencyPremium: 0, // Included in timePremium
      subtotal: subtotal, // Subtotal before platform fee and tax
      platformFee: Math.round(platformFee * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100, // Round to 2 decimal places
      suggestedBidRange
    };
  }

  /**
   * Calculate fare from ride object
   */
  async calculateFareFromRide(ride: Partial<Ride>): Promise<FareBreakdown> {
    const params: FareCalculationParams = {
      estimatedDistance: ride.estimatedDistance || 0,
      vehicleType: (ride.vehicleType as 'standard' | 'wheelchair' | 'stretcher') || 'standard',
      pickupStairs: ride.pickupStairs || 'none',
      dropoffStairs: ride.dropoffStairs || 'none',
      needsRamp: ride.needsRamp || false,
      needsCompanion: ride.needsCompanion || false,
      needsStairChair: ride.needsStairChair || false,
      needsWaitTime: ride.needsWaitTime || false,
      isRoundTrip: ride.isRoundTrip || false,
      isRecurring: !!ride.recurringAppointmentId,
      // Determine time of day from pickup time
      timeOfDay: this.getTimeOfDay(ride.pickupTime),
      dayOfWeek: this.getDayOfWeek(ride.pickupTime),
      urgency: 'standard' // Default urgency
    };

    return this.calculateFare(params);
  }

  /**
   * Get time of day category from timestamp
   */
  private getTimeOfDay(pickupTime?: Date): 'morning' | 'afternoon' | 'evening' | 'night' {
    if (!pickupTime) return 'afternoon';
    
    const hour = new Date(pickupTime).getHours();
    
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  /**
   * Get day of week category from timestamp
   */
  private getDayOfWeek(pickupTime?: Date): 'weekday' | 'weekend' {
    if (!pickupTime) return 'weekday';
    
    const dayOfWeek = new Date(pickupTime).getDay();
    return (dayOfWeek === 0 || dayOfWeek === 6) ? 'weekend' : 'weekday';
  }

  /**
   * Calculate bid range based on a base price
   */
  calculateBidRange(basePrice: number, flexibility: number = 0.30): { min: number; max: number } {
    return {
      min: Math.max(10, Math.floor(basePrice * (1 - flexibility))),
      max: Math.ceil(basePrice * (1 + flexibility))
    };
  }

  /**
   * Validate if a bid amount is within acceptable range
   */
  validateBidAmount(bidAmount: number, basePrice: number, flexibility: number = 0.30): boolean {
    const range = this.calculateBidRange(basePrice, flexibility);
    return bidAmount >= range.min && bidAmount <= range.max;
  }

  /**
   * Calculate platform fee (percentage taken from driver earnings)
   */
  calculatePlatformFee(rideTotal: number, feePercentage: number = 0.05): number {
    return Math.round(rideTotal * feePercentage * 100) / 100;
  }

  /**
   * Calculate driver earnings after platform fee
   */
  async calculateDriverEarnings(rideTotal: number): Promise<number> {
    const platformFeeRate = await this.getPlatformFeeRate();
    const platformFee = rideTotal * platformFeeRate;
    const driverEarnings = rideTotal - platformFee;
    
    return Math.round(driverEarnings * 100) / 100;
  }
  
  /**
   * Calculate driver earnings breakdown
   */
  async calculateDriverEarningsBreakdown(rideTotal: number): Promise<{
    total: number;
    platformFee: number;
    driverEarnings: number;
    platformFeePercentage: number;
  }> {
    const platformFeeRate = await this.getPlatformFeeRate();
    const platformFee = rideTotal * platformFeeRate;
    const driverEarnings = rideTotal - platformFee;
    
    return {
      total: rideTotal,
      platformFee: Math.round(platformFee * 100) / 100,
      driverEarnings: Math.round(driverEarnings * 100) / 100,
      platformFeePercentage: platformFeeRate * 100
    };
  }
}

export const fareCalculator = new FareCalculator();
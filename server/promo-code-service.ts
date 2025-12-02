import { storage } from "./storage";
import type { PromoCode } from "@shared/schema";

export interface PromoCodeValidationResult {
  success: boolean;
  description: string;
  finalAmount: number;
  discountAmount: number;
  promoCode?: PromoCode;
}

export class PromoCodeService {
  /**
   * Validates a promo code for a specific user and ride
   */
  async validatePromoCode(
    code: string,
    userId: number,
    rideAmount: number,
    userRole: string = 'rider'
  ): Promise<PromoCodeValidationResult> {
    try {
      // Find the promo code
      const promoCode = await storage.getPromoCodeByCode(code.toUpperCase());
      
      if (!promoCode) {
        return {
          success: false,
          description: "Invalid promo code",
          finalAmount: rideAmount,
          discountAmount: 0
        };
      }

      // Check if promo code is active
      if (!promoCode.isActive) {
        return {
          success: false,
          description: "This promo code is no longer active",
          finalAmount: rideAmount,
          discountAmount: 0
        };
      }

      // Check expiration date
      if (promoCode.expiresAt && new Date() > new Date(promoCode.expiresAt)) {
        return {
          success: false,
          description: "This promo code has expired",
          finalAmount: rideAmount,
          discountAmount: 0
        };
      }

      // Check usage limits
      if (promoCode.maxUses && promoCode.usedCount >= promoCode.maxUses) {
        return {
          success: false,
          description: "This promo code has reached its usage limit",
          finalAmount: rideAmount,
          discountAmount: 0
        };
      }

      // Check minimum amount requirement
      if (promoCode.minimumAmount && rideAmount < promoCode.minimumAmount) {
        return {
          success: false,
          description: `Minimum order amount of $${promoCode.minimumAmount.toFixed(2)} required`,
          finalAmount: rideAmount,
          discountAmount: 0
        };
      }

      // Check role eligibility
      let applicableRoles: string[] = [];
      try {
        applicableRoles = JSON.parse(promoCode.applicableRoles as string);
      } catch (e) {
        // If parsing fails, assume it's for all roles
        applicableRoles = ['rider', 'driver', 'admin'];
      }

      if (!applicableRoles.includes(userRole)) {
        return {
          success: false,
          description: "This promo code is not applicable to your account type",
          finalAmount: rideAmount,
          discountAmount: 0
        };
      }

      // Calculate discount
      const result = this.calculateDiscount(promoCode, rideAmount);

      return {
        success: true,
        description: "Promo code applied successfully",
        finalAmount: result.finalAmount,
        discountAmount: result.discountAmount,
        promoCode
      };

    } catch (error) {
      console.error("Error validating promo code:", error);
      return {
        success: false,
        description: "Error validating promo code",
        finalAmount: rideAmount,
        discountAmount: 0
      };
    }
  }

  /**
   * Calculates the discount amount based on promo code type
   */
  private calculateDiscount(promoCode: PromoCode, originalAmount: number): { finalAmount: number; discountAmount: number } {
    let discountAmount = 0;
    let finalAmount = originalAmount;

    switch (promoCode.discountType) {
      case 'fixed_amount':
        discountAmount = Math.min(promoCode.discountValue, originalAmount);
        finalAmount = Math.max(0, originalAmount - discountAmount);
        break;

      case 'percentage':
        discountAmount = (originalAmount * promoCode.discountValue) / 100;
        finalAmount = Math.max(0, originalAmount - discountAmount);
        break;

      case 'set_price':
        discountAmount = Math.max(0, originalAmount - promoCode.discountValue);
        finalAmount = promoCode.discountValue;
        break;

      default:
        // No discount for unknown types
        break;
    }

    return { finalAmount, discountAmount };
  }

  /**
   * Public method to calculate discounted price for API responses
   */
  calculateDiscountedPrice(originalAmount: number, promoCode: PromoCode): { finalAmount: number; discountAmount: number } {
    return this.calculateDiscount(promoCode, originalAmount);
  }

  /**
   * Applies a promo code to a ride and records the usage
   */
  async applyPromoCodeToRide(
    code: string,
    userId: number,
    rideId: number,
    rideAmount: number,
    userRole: string = 'rider'
  ): Promise<PromoCodeValidationResult> {
    try {
      // First validate the promo code
      const validation = await this.validatePromoCode(code, userId, rideAmount, userRole);
      
      if (!validation.success) {
        return validation;
      }

      // Record the usage
      await this.recordPromoCodeUsage(validation.promoCode!.id, userId, rideId, rideAmount, validation.discountAmount);

      // Update the used count
      await storage.updatePromoCode(validation.promoCode!.id, {
        usedCount: validation.promoCode!.usedCount + 1
      });

      // Update the ride's final price and promo code used
      await storage.updateRidePromoCode(rideId, validation.promoCode!.id, validation.finalAmount);

      return validation;

    } catch (error) {
      console.error("Error applying promo code:", error);
      return {
        success: false,
        description: "Error applying promo code",
        finalAmount: rideAmount,
        discountAmount: 0
      };
    }
  }

  /**
   * Records promo code usage for audit trail
   */
  private async recordPromoCodeUsage(
    promoCodeId: number,
    userId: number,
    rideId: number,
    originalAmount: number,
    discountAmount: number
  ): Promise<void> {
    try {
      // Create promo code usage record
      await storage.createPromoCodeUsage({
        promoCodeId,
        userId,
        rideId,
        originalAmount,
        finalAmount: originalAmount - discountAmount,
        discountAmount,
        appliedAt: new Date()
      });
    } catch (error) {
      console.error("Error recording promo code usage:", error);
      // Don't throw error here as it's not critical for the payment flow
    }
  }

  /**
   * Get promo code usage analytics
   */
  async getPromoCodeAnalytics(promoCodeId: number): Promise<any> {
    try {
      const usageRecords = await storage.getPromoCodeUsage(promoCodeId);
      
      const totalUsage = usageRecords.length;
      const totalDiscount = usageRecords.reduce((sum, record) => sum + record.discountAmount, 0);
      const uniqueUsers = new Set(usageRecords.map(record => record.userId)).size;
      
      return {
        totalUsage,
        totalDiscount,
        uniqueUsers,
        usageRecords
      };
    } catch (error) {
      console.error("Error getting promo code analytics:", error);
      return {
        totalUsage: 0,
        totalDiscount: 0,
        uniqueUsers: 0,
        usageRecords: []
      };
    }
  }
}

export const promoCodeService = new PromoCodeService();
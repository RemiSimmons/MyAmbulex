import { storage } from "./storage";
import { stripeConnectService } from "./stripe-connect-service";
import { fareCalculator } from "./fare-calculator";
import { insertDriverPayoutSchema } from "@shared/schema";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export class DriverPayoutService {
  /**
   * Get platform fee percentage from settings (default 5%)
   */
  private async getPlatformFeePercentage(): Promise<number> {
    try {
      const setting = await storage.getPlatformSetting('platform_fee_percentage');
      return setting ? parseFloat(setting.value) : 5.0;
    } catch (error) {
      console.error('Error getting platform fee percentage:', error);
      return 5.0; // Default fallback
    }
  }

  /**
   * Process a driver payout after successful ride payment
   */
  async processDriverPayout(rideId: number, driverId: number, totalAmount: number) {
    try {
      console.log(`Processing driver payout for ride ${rideId}, driver ${driverId}, amount $${totalAmount}`);
      
      // Check if payout already exists
      const existingPayout = await storage.getDriverPayoutByRide(rideId);
      if (existingPayout) {
        console.log(`Payout already exists for ride ${rideId}`);
        return existingPayout;
      }

      // Get configurable platform fee percentage
      const platformFeePercentage = await this.getPlatformFeePercentage();
      const platformFee = totalAmount * (platformFeePercentage / 100);
      const driverEarnings = totalAmount - platformFee;
      
      // Get driver's Stripe Connect account
      const driver = await storage.getDriverById(driverId);
      if (!driver) {
        throw new Error(`Driver not found: ${driverId}`);
      }

      const stripeAccountId = await storage.getDriverStripeAccount(driver.userId);
      if (!stripeAccountId) {
        throw new Error(`Driver ${driverId} does not have a Stripe Connect account`);
      }

      // Create payout record
      const payoutData = {
        rideId,
        driverId,
        amount: totalAmount,
        platformFee,
        driverAmount: driverEarnings,
        processingFee: 0.30, // Stripe processing fee
        status: 'pending' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const payout = await storage.createDriverPayout(
        insertDriverPayoutSchema.parse(payoutData)
      );

      // Process the Stripe transfer
      try {
        const transferResult = await this.processStripeTransfer(
          stripeAccountId,
          driverEarnings,
          `Payout for ride ${rideId}`
        );

        if (transferResult.success) {
          // Update payout record with success
          await storage.updateDriverPayout(payout.id, {
            status: 'completed',
            stripeTransferId: transferResult.transferId,
            updatedAt: new Date()
          });
          
          console.log(`Driver payout completed: ${transferResult.transferId}`);
          return { ...payout, status: 'completed', stripeTransferId: transferResult.transferId };
        } else {
          // Update payout record with failure
          await storage.updateDriverPayout(payout.id, {
            status: 'failed',
            failureReason: transferResult.error,
            updatedAt: new Date()
          });
          
          console.error(`Driver payout failed: ${transferResult.error}`);
          return { ...payout, status: 'failed', failureReason: transferResult.error };
        }
      } catch (error) {
        console.error('Error processing Stripe transfer:', error);
        
        // Update payout record with failure
        await storage.updateDriverPayout(payout.id, {
          status: 'failed',
          failureReason: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date()
        });
        
        return { ...payout, status: 'failed', failureReason: error instanceof Error ? error.message : 'Unknown error' };
      }
    } catch (error) {
      console.error('Error processing driver payout:', error);
      throw error;
    }
  }

  /**
   * Process Stripe transfer to driver's connected account
   */
  private async processStripeTransfer(
    stripeAccountId: string,
    amount: number,
    description: string
  ): Promise<{ success: boolean; transferId?: string; error?: string }> {
    try {
      // Convert amount to cents
      const amountInCents = Math.round(amount * 100);
      
      // Create transfer to connected account
      const transfer = await stripe.transfers.create({
        amount: amountInCents,
        currency: 'usd',
        destination: stripeAccountId,
        description,
        metadata: {
          type: 'driver_payout'
        }
      });

      return {
        success: true,
        transferId: transfer.id
      };
    } catch (error) {
      console.error('Stripe transfer error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Stripe error'
      };
    }
  }

  /**
   * Get driver payout history
   */
  async getDriverPayoutHistory(driverId: number, limit: number = 10) {
    try {
      const payouts = await storage.getDriverPayouts(driverId, limit);
      return payouts;
    } catch (error) {
      console.error('Error fetching driver payout history:', error);
      throw error;
    }
  }

  /**
   * Retry failed payout
   */
  async retryFailedPayout(payoutId: number) {
    try {
      const payout = await storage.getDriverPayout(payoutId);
      if (!payout) {
        throw new Error('Payout not found');
      }

      if (payout.status !== 'failed') {
        throw new Error('Only failed payouts can be retried');
      }

      // Update status to processing
      await storage.updateDriverPayout(payoutId, {
        status: 'processing',
        updatedAt: new Date()
      });

      // Get driver's Stripe account
      const driver = await storage.getDriverById(payout.driverId);
      if (!driver) {
        throw new Error(`Driver not found: ${payout.driverId}`);
      }

      const stripeAccountId = await storage.getDriverStripeAccount(driver.userId);
      if (!stripeAccountId) {
        throw new Error(`Driver ${payout.driverId} does not have a Stripe Connect account`);
      }

      // Retry the transfer
      const transferResult = await this.processStripeTransfer(
        stripeAccountId,
        payout.driverAmount,
        `Retry payout for ride ${payout.rideId}`
      );

      if (transferResult.success) {
        await storage.updateDriverPayout(payoutId, {
          status: 'completed',
          stripeTransferId: transferResult.transferId,
          failureReason: null,
          updatedAt: new Date()
        });
        
        return { success: true, transferId: transferResult.transferId };
      } else {
        await storage.updateDriverPayout(payoutId, {
          status: 'failed',
          failureReason: transferResult.error,
          updatedAt: new Date()
        });
        
        return { success: false, error: transferResult.error };
      }
    } catch (error) {
      console.error('Error retrying payout:', error);
      throw error;
    }
  }
}

export const driverPayoutService = new DriverPayoutService();
import Stripe from "stripe";
import { storage } from "./storage";
import { emailNotificationService } from "./email-notification-service";
import { sseManager } from "./sse-manager";

// Initialize Stripe lazily to avoid startup errors
let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Missing Stripe Secret Key');
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    });
  }
  return stripe;
}

interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  paymentMethodType?: 'stripe' | 'paypal';
  error?: string;
  requiresAction?: boolean;
  clientSecret?: string;
}

export class AutomaticPaymentService {
  /**
   * Automatically process payment for a ride using saved payment method
   */
  async processRidePayment(rideId: number): Promise<PaymentResult> {
    try {
      const ride = await storage.getRide(rideId);
      if (!ride) {
        return { success: false, error: "Ride not found" };
      }

      const rider = await storage.getUserById(ride.riderId);
      if (!rider) {
        return { success: false, error: "Rider not found" };
      }

      // Get rider's saved payment methods
      const savedPaymentMethods = await this.getSavedPaymentMethods(ride.riderId);
      
      if (savedPaymentMethods.length === 0) {
        return { success: false, error: "No saved payment methods found" };
      }

      // Try to process payment with the primary payment method
      const primaryPaymentMethod = savedPaymentMethods.find(pm => pm.isPrimary) || savedPaymentMethods[0];
      
      if (primaryPaymentMethod.type === 'stripe') {
        return await this.processStripePayment(ride, primaryPaymentMethod);
      } else if (primaryPaymentMethod.type === 'paypal') {
        return await this.processPayPalPayment(ride, primaryPaymentMethod);
      }

      return { success: false, error: "Unsupported payment method type" };
    } catch (error) {
      console.error("Error processing automatic payment:", error);
      return { success: false, error: "Payment processing failed" };
    }
  }

  /**
   * Process payment using Stripe saved payment method
   */
  private async processStripePayment(ride: any, paymentMethod: any): Promise<PaymentResult> {
    try {
      const amount = Math.round((ride.finalPrice || ride.estimatedPrice) * 100); // Convert to cents

      const stripeInstance = getStripe();
      const paymentIntent = await stripeInstance.paymentIntents.create({
        amount,
        currency: 'usd',
        customer: paymentMethod.stripeCustomerId,
        payment_method: paymentMethod.stripePaymentMethodId,
        confirmation_method: 'manual',
        confirm: true,
        return_url: `${process.env.BASE_URL}/rider/rides/${ride.id}`,
        metadata: {
          rideId: ride.id.toString(),
          riderId: ride.riderId.toString(),
          driverId: ride.driverId?.toString() || '',
        }
      });

      if (paymentIntent.status === 'succeeded') {
        // Payment successful - update ride status
        await storage.updateRideStatus(ride.id, 'paid');
        await this.notifyPaymentSuccess(ride, paymentIntent.id);
        
        return {
          success: true,
          paymentIntentId: paymentIntent.id,
          paymentMethodType: 'stripe'
        };
      } else if (paymentIntent.status === 'requires_action') {
        // 3D Secure or other authentication required
        return {
          success: false,
          requiresAction: true,
          clientSecret: paymentIntent.client_secret,
          paymentMethodType: 'stripe'
        };
      } else {
        return {
          success: false,
          error: `Payment failed with status: ${paymentIntent.status}`
        };
      }
    } catch (error: any) {
      console.error("Stripe payment error:", error);
      return {
        success: false,
        error: error.message || "Stripe payment failed"
      };
    }
  }

  /**
   * Process payment using PayPal (placeholder - would integrate with PayPal APIs)
   */
  private async processPayPalPayment(ride: any, paymentMethod: any): Promise<PaymentResult> {
    try {
      // PayPal automatic payment processing would go here
      // For now, we'll mark as requiring manual payment
      return {
        success: false,
        error: "PayPal automatic payments not yet implemented",
        paymentMethodType: 'paypal'
      };
    } catch (error: any) {
      console.error("PayPal payment error:", error);
      return {
        success: false,
        error: error.message || "PayPal payment failed"
      };
    }
  }

  /**
   * Get saved payment methods for a user
   */
  private async getSavedPaymentMethods(userId: number): Promise<any[]> {
    try {
      // This would query the saved payment methods from the database
      // For now, we'll check if user has a Stripe customer ID
      const user = await storage.getUserById(userId);
      const savedMethods: any[] = [];

      if (user?.stripeCustomerId) {
        const stripeInstance = getStripe();
        const customer = await stripeInstance.customers.retrieve(user.stripeCustomerId);
        if (customer && !customer.deleted) {
          const paymentMethods = await stripeInstance.paymentMethods.list({
            customer: user.stripeCustomerId,
            type: 'card',
          });

          paymentMethods.data.forEach(pm => {
            savedMethods.push({
              id: pm.id,
              type: 'stripe',
              stripeCustomerId: user.stripeCustomerId,
              stripePaymentMethodId: pm.id,
              isPrimary: pm.id === customer.invoice_settings?.default_payment_method,
              last4: pm.card?.last4,
              brand: pm.card?.brand,
              expiryMonth: pm.card?.exp_month,
              expiryYear: pm.card?.exp_year
            });
          });
        }
      }

      return savedMethods;
    } catch (error) {
      console.error("Error fetching saved payment methods:", error);
      return [];
    }
  }

  /**
   * Notify relevant parties of successful payment
   */
  private async notifyPaymentSuccess(ride: any, paymentIntentId: string) {
    try {
      // Send email notification to rider
      await emailNotificationService.sendRidePaymentConfirmation(
        ride.riderId,
        ride.id,
        ride.finalPrice || ride.estimatedPrice,
        paymentIntentId
      );

      // Send real-time notification to rider
      sseManager.sendToUser(ride.riderId, {
        type: 'payment_success',
        rideId: ride.id,
        paymentIntentId,
        message: 'Payment processed successfully. Your ride is confirmed!'
      });

      // Notify driver that payment is complete
      if (ride.driverId) {
        sseManager.sendToUser(ride.driverId, {
          type: 'ride_payment_complete',
          rideId: ride.id,
          message: 'Payment received. You can now begin the ride.'
        });
      }

      console.log(`Payment success notifications sent for ride ${ride.id}`);
    } catch (error) {
      console.error("Error sending payment success notifications:", error);
    }
  }

  /**
   * Handle payment failure and notify user
   */
  async handlePaymentFailure(rideId: number, error: string) {
    try {
      const ride = await storage.getRide(rideId);
      if (!ride) return;

      // Send notification to rider about payment failure
      sseManager.sendToUser(ride.riderId, {
        type: 'payment_failed',
        rideId: ride.id,
        error,
        message: 'Payment failed. Please update your payment method and try again.'
      });

      // Send email notification
      await emailNotificationService.sendRidePaymentFailure(
        ride.riderId,
        ride.id,
        error
      );

      console.log(`Payment failure notifications sent for ride ${ride.id}`);
    } catch (error) {
      console.error("Error handling payment failure:", error);
    }
  }

  /**
   * Retry payment processing for failed payments
   */
  async retryPayment(rideId: number): Promise<PaymentResult> {
    console.log(`Retrying payment for ride ${rideId}`);
    return await this.processRidePayment(rideId);
  }
}

export const automaticPaymentService = new AutomaticPaymentService();
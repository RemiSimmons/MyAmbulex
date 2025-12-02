import Stripe from 'stripe';
import { storage } from './storage';
import { v4 as uuidv4 } from 'uuid';
import type { 
  PaymentMethod, 
  PaymentTransaction, 
  Refund, 
  CancellationPolicy,
  InsertPaymentMethod,
  InsertPaymentTransaction,
  InsertRefund,
  InsertPaymentMethodAudit
} from '@shared/schema';

// Initialize Stripe
const stripeKey = process.env.Stripe_Secret_Key || process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey, {
  apiVersion: '2023-10-16',
}) : null;

export interface PaymentProcessingResult {
  success: boolean;
  transactionId?: string;
  stripePaymentIntentId?: string;
  paypalOrderId?: string;
  error?: string;
  amount?: number;
  status?: string;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  amount?: number;
  status?: string;
  error?: string;
}

export interface CancellationCalculation {
  canCancel: boolean;
  refundAmount: number;
  refundPercentage: number;
  cancellationFee: number;
  reason: string;
  policy: CancellationPolicy | null;
}

export class PaymentService {
  
  /**
   * Create a payment intent for a ride
   */
  async createPaymentIntent(
    userId: number, 
    rideId: number, 
    amount: number, 
    paymentMethodId?: number,
    adminOverride = false,
    adminUserId?: number
  ): Promise<PaymentProcessingResult> {
    try {
      if (!stripe) {
        throw new Error('Stripe not configured');
      }

      const transactionId = `txn_${uuidv4()}`;
      
      // Get user's Stripe customer ID or create one
      const user = await storage.getUser(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.fullName,
          metadata: { userId: userId.toString() }
        });
        customerId = customer.id;
        await storage.updateUserStripeCustomerId(userId, customerId);
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethodId ? (await this.getStripePaymentMethodId(paymentMethodId)) : undefined,
        confirmation_method: 'manual',
        confirm: false,
        metadata: {
          userId: userId.toString(),
          rideId: rideId.toString(),
          transactionId,
          adminOverride: adminOverride.toString()
        }
      });

      // Create transaction record
      const transactionData: InsertPaymentTransaction = {
        transactionId,
        rideId,
        userId,
        paymentMethodId,
        stripePaymentIntentId: paymentIntent.id,
        amount: amount.toString(),
        currency: 'USD',
        type: 'payment',
        status: 'pending',
        provider: 'stripe',
        platformFee: (amount * 0.05).toString(), // 5% platform fee (consistent with fare calculator)
        processingFee: (amount * 0.029 + 0.30).toString(), // Stripe fees
        netAmount: (amount * 0.941 - 0.30).toString(), // Net after fees (95% - processing fee)
        adminOverride,
        adminUserId,
        metadata: { paymentIntentId: paymentIntent.id }
      };

      const transaction = await storage.createPaymentTransaction(transactionData);

      return {
        success: true,
        transactionId,
        stripePaymentIntentId: paymentIntent.id,
        amount,
        status: 'pending'
      };

    } catch (error) {
      console.error('Payment intent creation failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Payment processing failed' 
      };
    }
  }

  /**
   * Confirm a payment intent
   */
  async confirmPayment(paymentIntentId: string): Promise<PaymentProcessingResult> {
    try {
      if (!stripe) {
        throw new Error('Stripe not configured');
      }

      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
      
      // Update transaction status
      const transaction = await storage.getPaymentTransactionByStripeId(paymentIntentId);
      if (transaction) {
        await storage.updatePaymentTransaction(transaction.id, {
          status: paymentIntent.status === 'succeeded' ? 'succeeded' : 'failed',
          stripeChargeId: paymentIntent.charges?.data[0]?.id,
          failureCode: paymentIntent.last_payment_error?.code,
          failureMessage: paymentIntent.last_payment_error?.message
        });

        // If payment succeeded, trigger driver payout
        if (paymentIntent.status === 'succeeded') {
          this.triggerDriverPayout(transaction.rideId, paymentIntentId).catch(error => {
            console.error('Error triggering driver payout:', error);
            // Continue with payment confirmation even if payout fails
          });
        }
      }

      return {
        success: paymentIntent.status === 'succeeded',
        transactionId: transaction?.transactionId,
        stripePaymentIntentId: paymentIntentId,
        amount: paymentIntent.amount / 100,
        status: paymentIntent.status
      };

    } catch (error) {
      console.error('Payment confirmation failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Payment confirmation failed' 
      };
    }
  }

  /**
   * Process a refund
   */
  async processRefund(
    transactionId: string,
    amount: number,
    reason: string,
    initiatedBy: 'customer' | 'driver' | 'admin' | 'system',
    adminUserId?: number,
    adminNotes?: string
  ): Promise<RefundResult> {
    try {
      if (!stripe) {
        throw new Error('Stripe not configured');
      }

      const transaction = await storage.getPaymentTransactionByTransactionId(transactionId);
      if (!transaction) {
        return { success: false, error: 'Transaction not found' };
      }

      if (transaction.status !== 'succeeded') {
        return { success: false, error: 'Cannot refund non-successful transaction' };
      }

      const refundId = `ref_${uuidv4()}`;
      const isPartial = amount < parseFloat(transaction.amount);

      // Create Stripe refund
      const stripeRefund = await stripe.refunds.create({
        payment_intent: transaction.stripePaymentIntentId!,
        amount: Math.round(amount * 100),
        reason: this.mapRefundReason(reason),
        metadata: {
          refundId,
          originalTransactionId: transaction.id.toString(),
          initiatedBy,
          adminUserId: adminUserId?.toString() || ''
        }
      });

      // Create refund record
      const refundData: InsertRefund = {
        refundId,
        originalTransactionId: transaction.id,
        stripeRefundId: stripeRefund.id,
        amount: amount.toString(),
        currency: 'USD',
        reason,
        status: stripeRefund.status === 'succeeded' ? 'succeeded' : 'pending',
        type: isPartial ? 'partial' : 'full',
        initiatedBy,
        adminUserId,
        adminNotes,
        processingFee: (amount * 0.029).toString(),
        netRefund: (amount * 0.971).toString(),
        metadata: { stripeRefundId: stripeRefund.id }
      };

      const refund = await storage.createRefund(refundData);

      return {
        success: true,
        refundId,
        amount,
        status: stripeRefund.status
      };

    } catch (error) {
      console.error('Refund processing failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Refund processing failed' 
      };
    }
  }

  /**
   * Calculate cancellation policy for a ride
   */
  async calculateCancellation(
    rideId: number,
    requestedBy: 'rider' | 'driver' | 'admin',
    adminOverride = false
  ): Promise<CancellationCalculation> {
    try {
      const ride = await storage.getRide(rideId);
      if (!ride) {
        return {
          canCancel: false,
          refundAmount: 0,
          refundPercentage: 0,
          cancellationFee: 0,
          reason: 'Ride not found',
          policy: null
        };
      }

      // Get applicable cancellation policy
      const policy = await storage.getDefaultCancellationPolicy();
      if (!policy) {
        return {
          canCancel: adminOverride,
          refundAmount: adminOverride ? parseFloat(ride.riderBid || '0') : 0,
          refundPercentage: adminOverride ? 100 : 0,
          cancellationFee: 0,
          reason: adminOverride ? 'Admin override applied' : 'No cancellation policy found',
          policy: null
        };
      }

      const now = new Date();
      const pickupTime = new Date(ride.pickupTime);
      const hoursUntilPickup = (pickupTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      const rideAmount = parseFloat(ride.riderBid || '0');
      let refundPercentage = 0;
      let reason = '';

      // Admin override
      if (adminOverride && requestedBy === 'admin') {
        return {
          canCancel: true,
          refundAmount: rideAmount,
          refundPercentage: 100,
          cancellationFee: 0,
          reason: 'Admin override - full refund',
          policy
        };
      }

      // Apply policy rules
      if (hoursUntilPickup >= (policy.freeCancel || 24)) {
        refundPercentage = 100;
        reason = 'Free cancellation period';
      } else if (hoursUntilPickup >= (policy.partialRefund || 4)) {
        refundPercentage = parseFloat(policy.partialRefundPercentage || '50');
        reason = 'Partial refund period';
      } else if (hoursUntilPickup >= (policy.noRefund || 1)) {
        refundPercentage = 0;
        reason = 'No refund period';
      } else {
        refundPercentage = 0;
        reason = 'Too close to pickup time';
      }

      const refundAmount = (rideAmount * refundPercentage) / 100;
      const cancellationFee = rideAmount - refundAmount;

      return {
        canCancel: true,
        refundAmount,
        refundPercentage,
        cancellationFee,
        reason,
        policy
      };

    } catch (error) {
      console.error('Cancellation calculation failed:', error);
      return {
        canCancel: false,
        refundAmount: 0,
        refundPercentage: 0,
        cancellationFee: 0,
        reason: 'Calculation error',
        policy: null
      };
    }
  }

  /**
   * Add a payment method for a user
   */
  async addPaymentMethod(
    userId: number,
    stripePaymentMethodId: string,
    setAsDefault = false
  ): Promise<{ success: boolean; paymentMethodId?: number; error?: string }> {
    try {
      if (!stripe) {
        throw new Error('Stripe not configured');
      }

      // Retrieve payment method from Stripe
      const stripePaymentMethod = await stripe.paymentMethods.retrieve(stripePaymentMethodId);

      // Get or create Stripe customer
      const user = await storage.getUser(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.fullName,
          metadata: { userId: userId.toString() }
        });
        customerId = customer.id;
        await storage.updateUserStripeCustomerId(userId, customerId);
      }

      // Attach payment method to customer
      await stripe.paymentMethods.attach(stripePaymentMethodId, {
        customer: customerId,
      });

      // If setting as default, unset other defaults
      if (setAsDefault) {
        await storage.unsetDefaultPaymentMethods(userId);
      }

      // Create payment method record
      const paymentMethodData: InsertPaymentMethod = {
        userId,
        stripePaymentMethodId,
        type: stripePaymentMethod.type,
        provider: 'stripe',
        last4: stripePaymentMethod.card?.last4,
        brand: stripePaymentMethod.card?.brand,
        expiryMonth: stripePaymentMethod.card?.exp_month,
        expiryYear: stripePaymentMethod.card?.exp_year,
        holderName: stripePaymentMethod.billing_details.name,
        isDefault: setAsDefault,
        isActive: true,
        metadata: { fingerprint: stripePaymentMethod.card?.fingerprint }
      };

      const paymentMethod = await storage.createPaymentMethod(paymentMethodData);

      // Log audit trail
      await storage.createPaymentMethodAudit({
        paymentMethodId: paymentMethod.id,
        action: 'created',
        userId,
        newData: paymentMethodData,
        reason: 'User added new payment method'
      });

      return { success: true, paymentMethodId: paymentMethod.id };

    } catch (error) {
      console.error('Add payment method failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to add payment method' 
      };
    }
  }

  /**
   * Remove a payment method
   */
  async removePaymentMethod(
    paymentMethodId: number,
    userId: number,
    adminOverride = false,
    adminUserId?: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const paymentMethod = await storage.getPaymentMethod(paymentMethodId);
      if (!paymentMethod) {
        return { success: false, error: 'Payment method not found' };
      }

      if (paymentMethod.userId !== userId && !adminOverride) {
        return { success: false, error: 'Unauthorized' };
      }

      // Detach from Stripe if applicable
      if (stripe && paymentMethod.stripePaymentMethodId) {
        try {
          await stripe.paymentMethods.detach(paymentMethod.stripePaymentMethodId);
        } catch (error) {
          console.warn('Failed to detach from Stripe:', error);
        }
      }

      // Deactivate payment method
      await storage.updatePaymentMethod(paymentMethodId, { isActive: false });

      // Log audit trail
      await storage.createPaymentMethodAudit({
        paymentMethodId,
        action: 'deleted',
        userId: adminOverride ? adminUserId : userId,
        adminUserId: adminOverride ? adminUserId : undefined,
        oldData: paymentMethod,
        reason: adminOverride ? 'Admin removal' : 'User removal'
      });

      return { success: true };

    } catch (error) {
      console.error('Remove payment method failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to remove payment method' 
      };
    }
  }

  /**
   * Process admin override charge
   */
  async adminOverrideCharge(
    userId: number,
    amount: number,
    reason: string,
    adminUserId: number,
    rideId?: number
  ): Promise<PaymentProcessingResult> {
    try {
      const transactionId = `admin_${uuidv4()}`;

      // Create transaction record with admin override
      const transactionData: InsertPaymentTransaction = {
        transactionId,
        rideId,
        userId,
        amount: amount.toString(),
        currency: 'USD',
        type: 'payment',
        status: 'succeeded', // Admin overrides are immediately successful
        provider: 'admin_override',
        platformFee: '0',
        processingFee: '0',
        netAmount: amount.toString(),
        adminOverride: true,
        adminUserId,
        adminNotes: reason,
        metadata: { adminOverride: true, reason }
      };

      const transaction = await storage.createPaymentTransaction(transactionData);

      return {
        success: true,
        transactionId,
        amount,
        status: 'succeeded'
      };

    } catch (error) {
      console.error('Admin override charge failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Admin override failed' 
      };
    }
  }

  /**
   * Process admin credit (negative charge)
   */
  async adminCredit(
    userId: number,
    amount: number,
    reason: string,
    adminUserId: number,
    rideId?: number
  ): Promise<PaymentProcessingResult> {
    try {
      const transactionId = `credit_${uuidv4()}`;

      // Create negative transaction record
      const transactionData: InsertPaymentTransaction = {
        transactionId,
        rideId,
        userId,
        amount: (-amount).toString(), // Negative amount for credit
        currency: 'USD',
        type: 'refund',
        status: 'succeeded',
        provider: 'admin_override',
        platformFee: '0',
        processingFee: '0',
        netAmount: (-amount).toString(),
        adminOverride: true,
        adminUserId,
        adminNotes: reason,
        metadata: { adminCredit: true, reason }
      };

      const transaction = await storage.createPaymentTransaction(transactionData);

      return {
        success: true,
        transactionId,
        amount: -amount,
        status: 'succeeded'
      };

    } catch (error) {
      console.error('Admin credit failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Admin credit failed' 
      };
    }
  }

  /**
   * Get payment history for a user
   */
  async getPaymentHistory(
    userId: number,
    limit = 50,
    offset = 0
  ): Promise<PaymentTransaction[]> {
    return await storage.getPaymentTransactionsByUser(userId, limit, offset);
  }

  /**
   * Get refund history for a user
   */
  async getRefundHistory(userId: number, limit = 50, offset = 0): Promise<Refund[]> {
    return await storage.getRefundsByUser(userId, limit, offset);
  }

  // Helper methods

  private async getStripePaymentMethodId(paymentMethodId: number): Promise<string | undefined> {
    const paymentMethod = await storage.getPaymentMethod(paymentMethodId);
    return paymentMethod?.stripePaymentMethodId || undefined;
  }

  private mapRefundReason(reason: string): 'duplicate' | 'fraudulent' | 'requested_by_customer' {
    switch (reason) {
      case 'duplicate': return 'duplicate';
      case 'fraudulent': return 'fraudulent';
      default: return 'requested_by_customer';
    }
  }

  /**
   * Trigger driver payout after successful payment
   * @private
   */
  private async triggerDriverPayout(rideId: number, paymentIntentId: string): Promise<void> {
    try {
      // Get the ride to find the driver and amount
      const ride = await storage.getRide(rideId);
      if (!ride || !ride.driverId) {
        console.log(`No driver assigned to ride ${rideId} - skipping payout`);
        return;
      }

      const totalAmount = parseFloat(ride.finalPrice || ride.riderBid || '0');
      if (totalAmount <= 0) {
        console.log(`No valid amount for ride ${rideId} - skipping payout`);
        return;
      }

      const { driverPayoutService } = await import('./driver-payout-service');
      const result = await driverPayoutService.processDriverPayout(rideId, ride.driverId, totalAmount);
      
      if (result.status === 'completed') {
        console.log(`Driver payout completed: $${result.driverAmount} for ride ${rideId}`);
      } else if (result.status === 'failed') {
        console.error(`Driver payout failed for ride ${rideId}:`, result.failureReason);
      } else {
        console.log(`Driver payout ${result.status} for ride ${rideId}: $${result.driverAmount}`);
      }
    } catch (error) {
      console.error('Error in driver payout process:', error);
    }
  }
}

export const paymentService = new PaymentService();
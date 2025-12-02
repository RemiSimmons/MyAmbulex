import Stripe from 'stripe';

// Initialize Stripe lazily to avoid startup errors
let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    const stripeKey = process.env.Stripe_Secret_Key || process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error('Missing Stripe Secret Key');
    }
    stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16' as any,
    });
  }
  return stripe;
}

/**
 * Service to manage Stripe payment operations
 */
export class StripeService {
  /**
   * Create a payment intent for a ride
   * @param amount The amount to charge in dollars
   * @param currency The currency, defaulting to USD
   * @param metadata Optional metadata to associate with the payment
   * @returns The created payment intent with client secret
   */
  async createPaymentIntent(amount: number, currency = 'usd', metadata = {}): Promise<Stripe.PaymentIntent> {
    // Convert amount to cents (Stripe uses smallest currency unit)
    const amountInCents = Math.round(amount * 100);

    const stripeInstance = getStripe();
    return await stripeInstance.paymentIntents.create({
      amount: amountInCents,
      currency,
      metadata,
      payment_method_types: ['card'],
    });
  }

  /**
   * Create or update a customer record in Stripe
   * @param userId The user's internal ID
   * @param email The user's email
   * @param name The user's name
   * @returns The Stripe customer object
   */
  async createOrUpdateCustomer(userId: number, email: string, name: string): Promise<Stripe.Customer> {
    const stripeInstance = getStripe();
    // Look for existing customer by metadata
    const customers = await stripeInstance.customers.list({
      limit: 1,
      email
    });

    if (customers.data.length > 0) {
      // Update existing customer
      return await stripeInstance.customers.update(customers.data[0].id, {
        name,
        metadata: { userId: userId.toString() }
      });
    } else {
      // Create new customer
      return await stripeInstance.customers.create({
        email,
        name,
        metadata: { userId: userId.toString() }
      });
    }
  }

  /**
   * Process a payment for a ride
   * @param rideId The ID of the ride to charge for
   * @param amount The amount to charge
   * @param paymentMethodId The payment method ID from Stripe Elements
   * @param customerId The Stripe customer ID
   * @returns The payment result
   */
  async processRidePayment(
    rideId: number, 
    amount: number, 
    paymentMethodId: string, 
    customerId: string
  ): Promise<Stripe.PaymentIntent> {
    const stripeInstance = getStripe();
    return await stripeInstance.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      payment_method: paymentMethodId,
      customer: customerId,
      confirm: true,
      metadata: {
        rideId: rideId.toString(),
        type: 'ride_payment'
      },
      description: `Payment for ride #${rideId}`,
    });
  }

  /**
   * Refund a payment
   * @param paymentIntentId The payment intent ID to refund
   * @param amount Optional amount to refund (if not full amount)
   * @returns The refund object
   */
  async refundPayment(paymentIntentId: string, amount?: number): Promise<Stripe.Refund> {
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
      metadata: { reason: 'customer_request' }
    };

    if (amount) {
      refundParams.amount = Math.round(amount * 100);
    }

    const stripeInstance = getStripe();
    return await stripeInstance.refunds.create(refundParams);
  }

  /**
   * Get payment history for a customer
   * @param customerId The Stripe customer ID
   * @returns List of payment intents
   */
  async getCustomerPayments(customerId: string): Promise<Stripe.ApiList<Stripe.PaymentIntent>> {
    const stripeInstance = getStripe();
    return await stripeInstance.paymentIntents.list({
      customer: customerId,
      limit: 50,
    });
  }
  
  /**
   * Admin function to update payment status
   * @param paymentIntentId The payment intent ID
   * @param newStatus The new status to set
   * @returns The updated payment intent
   */
  async adminUpdatePaymentStatus(paymentIntentId: string, newStatus: string): Promise<Stripe.PaymentIntent> {
    const stripeInstance = getStripe();
    if (newStatus === 'succeeded') {
      // For admin override, we can mark a payment as succeeded without actual payment
      // This is for exceptional cases
      return await stripeInstance.paymentIntents.update(paymentIntentId, {
        metadata: { admin_override: 'true' }
      });
    } else if (newStatus === 'canceled') {
      return await stripeInstance.paymentIntents.cancel(paymentIntentId);
    }
    
    throw new Error(`Unsupported payment status update: ${newStatus}`);
  }

  /**
   * Webhook handler for Stripe events
   * @param eventData The raw event data from Stripe
   * @param signature The Stripe signature from the request header
   * @returns The parsed event
   */
  constructWebhookEvent(eventData: string, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      throw new Error('Missing Stripe webhook secret');
    }
    
    const stripeInstance = getStripe();
    return stripeInstance.webhooks.constructEvent(
      eventData,
      signature,
      webhookSecret
    );
  }
  
  /**
   * Create a setup intent for adding payment methods
   * @param customerId The Stripe customer ID
   * @returns The setup intent with client secret
   */
  async setupIntent(customerId: string): Promise<Stripe.SetupIntent> {
    const stripeInstance = getStripe();
    return await stripeInstance.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });
  }
}

export const stripeService = new StripeService();
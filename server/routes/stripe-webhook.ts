import express, { Express, Request, Response } from "express";
import { stripeService } from "../stripe-service";
import { stripeConnectService } from "../stripe-connect-service";
import { storage } from "../storage";
import Stripe from "stripe";

/**
 * Setup Stripe webhook routes
 * Webhooks allow Stripe to notify your server about events (payments, refunds, etc.)
 */
export function setupStripeWebhookRoutes(app: Express) {
  // Stripe webhook endpoint
  // IMPORTANT: This endpoint must be accessible from the internet for Stripe to send events
  // Use a tool like ngrok for local development: ngrok http 3000
  app.post(
    "/api/webhooks/stripe",
    // Express middleware to capture raw body for webhook signature verification
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const sig = req.headers["stripe-signature"] as string;

      if (!sig) {
        console.error("⚠️ Stripe webhook: Missing signature header");
        return res.status(400).json({ error: "Missing stripe-signature header" });
      }

      try {
        // Verify webhook signature and parse event
        const event = stripeService.constructWebhookEvent(
          req.body.toString(),
          sig
        );

        console.log(`🔔 Stripe webhook received: ${event.type}`, {
          id: event.id,
          type: event.type,
          livemode: event.livemode,
        });

        // Handle different event types
        switch (event.type) {
          case "payment_intent.succeeded":
            await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
            break;

          case "payment_intent.payment_failed":
            await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
            break;

          case "payment_intent.canceled":
            await handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent);
            break;

          case "charge.refunded":
            await handleChargeRefunded(event.data.object as Stripe.Charge);
            break;

          case "customer.created":
            await handleCustomerCreated(event.data.object as Stripe.Customer);
            break;

          case "customer.updated":
            await handleCustomerUpdated(event.data.object as Stripe.Customer);
            break;

          // Stripe Connect events
          case "account.updated":
          case "account.application.authorized":
          case "account.application.deauthorized":
          case "transfer.created":
          case "transfer.updated":
            await stripeConnectService.handleWebhookEvent(event);
            break;

          default:
            console.log(`⚠️ Unhandled Stripe webhook event: ${event.type}`);
        }

        // Always return 200 to acknowledge receipt
        res.json({ received: true });
      } catch (error) {
        console.error("❌ Stripe webhook error:", error);
        
        if (error instanceof Error) {
          return res.status(400).json({ 
            error: `Webhook signature verification failed: ${error.message}` 
          });
        }
        
        res.status(500).json({ error: "Webhook processing failed" });
      }
    }
  );
}

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log("✅ Payment succeeded:", {
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    rideId: paymentIntent.metadata.rideId,
  });

  const rideId = paymentIntent.metadata.rideId
    ? parseInt(paymentIntent.metadata.rideId)
    : null;

  if (rideId) {
    // Update ride status to paid
    await storage.updateRideStatus(rideId, "paid");

    // Create payment record
    await storage.createPayment({
      rideId,
      amount: paymentIntent.amount / 100, // Convert from cents to dollars
      currency: paymentIntent.currency,
      paymentMethod: "stripe",
      paymentIntentId: paymentIntent.id,
      status: "completed",
      transactionId: paymentIntent.id,
    });

    // Send notification to rider
    const ride = await storage.getRide(rideId);
    if (ride) {
      const { notificationService } = await import("../notifications");
      await notificationService.createNotification({
        userId: ride.riderId,
        type: "PAYMENT_SUCCESS",
        title: "Payment Successful",
        message: `Your payment of $${(paymentIntent.amount / 100).toFixed(2)} has been processed successfully.`,
        link: `/rider/rides/${rideId}`,
      });
    }
  }
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log("❌ Payment failed:", {
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    error: paymentIntent.last_payment_error?.message,
  });

  const rideId = paymentIntent.metadata.rideId
    ? parseInt(paymentIntent.metadata.rideId)
    : null;

  if (rideId) {
    // Update payment record if exists
    const payments = await storage.getPaymentsByRideId(rideId);
    const payment = payments.find((p) => p.paymentIntentId === paymentIntent.id);
    
    if (payment) {
      await storage.updatePayment(payment.id, {
        status: "failed",
      });
    }

    // Send notification to rider
    const ride = await storage.getRide(rideId);
    if (ride) {
      const { notificationService } = await import("../notifications");
      await notificationService.createNotification({
        userId: ride.riderId,
        type: "PAYMENT_FAILED",
        title: "Payment Failed",
        message: `Payment failed: ${paymentIntent.last_payment_error?.message || "Unknown error"}`,
        link: `/rider/rides/${rideId}`,
      });
    }
  }
}

/**
 * Handle canceled payment intent
 */
async function handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent) {
  console.log("⚠️ Payment canceled:", {
    paymentIntentId: paymentIntent.id,
  });

  const rideId = paymentIntent.metadata.rideId
    ? parseInt(paymentIntent.metadata.rideId)
    : null;

  if (rideId) {
    // Update payment record if exists
    const payments = await storage.getPaymentsByRideId(rideId);
    const payment = payments.find((p) => p.paymentIntentId === paymentIntent.id);
    
    if (payment) {
      await storage.updatePayment(payment.id, {
        status: "canceled",
      });
    }
  }
}

/**
 * Handle refunded charge
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log("💰 Charge refunded:", {
    chargeId: charge.id,
    amount: charge.amount_refunded,
    paymentIntentId: charge.payment_intent,
  });

  if (charge.payment_intent && typeof charge.payment_intent === "string") {
    // Find payment by payment intent ID
    // Note: You may need to add a method to search payments by paymentIntentId
    const paymentIntentId = charge.payment_intent;
    
    // Update payment record to reflect refund
    // This would require a method like: storage.getPaymentByPaymentIntentId(paymentIntentId)
    console.log("Refund processed for payment intent:", paymentIntentId);
  }
}

/**
 * Handle customer created
 */
async function handleCustomerCreated(customer: Stripe.Customer) {
  console.log("👤 Customer created:", {
    customerId: customer.id,
    email: customer.email,
    userId: customer.metadata.userId,
  });

  // Update user with Stripe customer ID if userId is in metadata
  if (customer.metadata.userId) {
    const userId = parseInt(customer.metadata.userId);
    await storage.updateUser(userId, {
      stripeCustomerId: customer.id,
    });
  }
}

/**
 * Handle customer updated
 */
async function handleCustomerUpdated(customer: Stripe.Customer) {
  console.log("👤 Customer updated:", {
    customerId: customer.id,
    email: customer.email,
  });

  // Update user information if needed
  if (customer.metadata.userId) {
    const userId = parseInt(customer.metadata.userId);
    // You can update user details here if needed
  }
}


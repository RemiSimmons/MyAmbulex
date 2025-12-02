import { Express, Request, Response } from "express";
import Stripe from "stripe";
import { storage } from "../storage";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia",
});

// Authentication middleware
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export function setupStripeSetupRoutes(app: Express) {
  // Create setup intent for payment method collection
  app.post("/api/stripe/setup-intent", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      
      console.log("🔵 Creating setup intent for user:", {
        userId: user.id,
        username: user.username,
        role: user.role
      });

      // Only riders can set up payment methods
      if (user.role !== 'rider') {
        return res.status(403).json({ error: "Only riders can set up payment methods" });
      }

      let customerId = user.stripeCustomerId;

      // Create Stripe customer if doesn't exist
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.username,
          metadata: {
            userId: user.id.toString(),
            role: user.role
          }
        });
        customerId = customer.id;

        // Update user with Stripe customer ID
        await storage.updateUser(user.id, { stripeCustomerId: customerId });
        
        console.log("🔵 Created new Stripe customer:", customerId);
      }

      // Create setup intent
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session', // For future payments
        metadata: {
          userId: user.id.toString()
        }
      });

      console.log("🔵 Setup intent created:", {
        id: setupIntent.id,
        status: setupIntent.status,
        customerId: customerId
      });

      res.json({
        clientSecret: setupIntent.client_secret,
        customerId: customerId
      });

    } catch (error) {
      console.error("🔴 Setup intent creation error:", error);
      
      if (error instanceof Stripe.errors.StripeError) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: "Failed to create setup intent" });
    }
  });

  // Confirm payment method setup and store details
  app.post("/api/stripe/confirm-payment-method", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { paymentMethodId } = req.body;
      
      console.log("🔵 Confirming payment method setup:", {
        userId: user.id,
        paymentMethodId: paymentMethodId
      });

      if (!paymentMethodId) {
        return res.status(400).json({ error: "Payment method ID is required" });
      }

      // Retrieve payment method details from Stripe
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
      
      if (!paymentMethod.card) {
        return res.status(400).json({ error: "Only card payment methods are supported" });
      }

      // Update user profile with payment method details
      const userProfile = await storage.getUserProfile(user.id);
      if (userProfile) {
        await storage.updateUserProfile(user.id, {
          defaultPaymentMethodId: paymentMethodId
        });
      } else {
        // Create new profile with payment method
        await storage.createUserProfile({
          userId: user.id,
          defaultPaymentMethodId: paymentMethodId
        });
      }

      console.log("🔵 Payment method setup completed:", {
        userId: user.id,
        brand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4
      });

      res.json({
        success: true,
        paymentMethod: {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          expMonth: paymentMethod.card.exp_month,
          expYear: paymentMethod.card.exp_year
        }
      });

    } catch (error) {
      console.error("🔴 Payment method confirmation error:", error);
      
      if (error instanceof Stripe.errors.StripeError) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: "Failed to confirm payment method" });
    }
  });

  // Get payment method status
  app.get("/api/stripe/payment-method-status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      
      // Get user profile to check payment method setup
      const profile = await storage.getUserProfile(user.id);
      
      const hasPaymentMethod = profile?.defaultPaymentMethodId && user.stripeCustomerId;
      
      if (hasPaymentMethod && profile?.defaultPaymentMethodId) {
        try {
          // Retrieve current payment method details from Stripe
          const paymentMethod = await stripe.paymentMethods.retrieve(profile.defaultPaymentMethodId);
          
          res.json({
            hasPaymentMethod: true,
            customerId: user.stripeCustomerId,
            paymentMethod: {
              brand: paymentMethod.card?.brand,
              last4: paymentMethod.card?.last4,
              expMonth: paymentMethod.card?.exp_month,
              expYear: paymentMethod.card?.exp_year
            }
          });
        } catch (error) {
          console.error("🔴 Error retrieving payment method:", error);
          res.json({
            hasPaymentMethod: false,
            customerId: user.stripeCustomerId,
            paymentMethod: null
          });
        }
      } else {
        res.json({
          hasPaymentMethod: false,
          customerId: user.stripeCustomerId,
          paymentMethod: null
        });
      }

    } catch (error) {
      console.error("🔴 Payment method status check error:", error);
      res.status(500).json({ error: "Failed to check payment method status" });
    }
  });

  // Auto-charge when rider accepts bid
  app.post("/api/stripe/auto-charge", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { rideId, bidId } = req.body;
      
      console.log("🔵 Auto-charging for ride:", {
        userId: user.id,
        rideId: rideId,
        bidId: bidId
      });

      // Get ride details
      const ride = await storage.getRide(rideId);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }

      // Verify user can access this ride
      if (ride.riderId !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get bid details
      const bid = await storage.getBid(bidId);
      if (!bid) {
        return res.status(404).json({ error: "Bid not found" });
      }

      // Get user profile for payment method
      const profile = await storage.getUserProfile(user.id);
      if (!profile?.defaultPaymentMethodId || !user.stripeCustomerId) {
        return res.status(400).json({ error: "Payment method not set up" });
      }

      // Calculate amount in cents
      const amountInCents = Math.round(bid.amount * 100);

      // Create payment intent with stored payment method
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "usd",
        customer: user.stripeCustomerId,
        payment_method: profile.defaultPaymentMethodId,
        confirmation_method: 'automatic',
        confirm: true,
        off_session: true, // Use stored payment method
        metadata: {
          rideId: rideId.toString(),
          bidId: bidId.toString(),
          userId: user.id.toString()
        }
      });

      if (paymentIntent.status === 'succeeded') {
        // Update ride status to paid
        await storage.updateRideStatus(rideId, 'paid');
        
        // Update bid status to accepted (if not already)
        if (bid.status !== 'accepted') {
          await storage.updateBidStatus(bidId, 'accepted');
        }

        console.log("🔵 Auto-charge successful:", {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          rideId: rideId
        });

        res.json({
          success: true,
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount
        });
      } else {
        console.log("🔴 Auto-charge failed:", {
          status: paymentIntent.status,
          rideId: rideId
        });
        
        res.status(400).json({ 
          error: "Payment failed",
          status: paymentIntent.status 
        });
      }

    } catch (error) {
      console.error("🔴 Auto-charge error:", error);
      
      if (error instanceof Stripe.errors.StripeError) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: "Failed to process automatic payment" });
    }
  });
}
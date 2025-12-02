import { Express, Request, Response } from "express";
import Stripe from "stripe";
import { storage } from "./storage";

// Initialize Stripe with environment variable
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-07-30.basil",
});

// Simple authentication middleware - assumes user is set by passport
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export function setupPaymentRoutes(app: Express) {
  // Payment intent creation route
  app.post("/api/create-payment-intent", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("🔵 Payment intent creation request:", {
        userId: req.user?.id,
        userRole: req.user?.role,
        body: req.body,
        timestamp: new Date().toISOString()
      });

      const { rideId, admin_discount } = req.body;

      // Validate input
      if (!rideId) {
        return res.status(400).json({ error: "Ride ID is required" });
      }

      // Get ride details
      const ride = await storage.getRide(rideId);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }

      console.log("🔵 Retrieved ride:", {
        id: ride.id,
        finalPrice: ride.finalPrice,
        riderBid: ride.riderBid,
        riderId: ride.riderId,
        currentUser: req.user?.id
      });

      // Verify user can access this ride
      if (ride.riderId !== req.user?.id && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Access denied" });
      }

      // Calculate payment amount - use finalPrice if available, otherwise riderBid
      let amount = ride.finalPrice || ride.riderBid || 0;

      // Apply admin discount if requested and user is admin
      if (admin_discount && req.user?.role === 'admin') {
        amount = 100; // $1.00 in cents
        console.log("🔵 Admin discount applied, amount set to $1.00");
      }

      // Convert to cents if not already
      const amountInCents = Math.round(amount * 100);

      console.log("🔵 Creating payment intent:", {
        amount: amountInCents,
        currency: "usd",
        rideId: rideId,
        adminDiscount: admin_discount && req.user?.role === 'admin'
      });

      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "usd",
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          rideId: rideId.toString(),
          userId: req.user?.id.toString(),
          adminDiscount: admin_discount && req.user?.role === 'admin' ? 'true' : 'false'
        }
      });

      console.log("🔵 Payment intent created successfully:", {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        status: paymentIntent.status
      });

      // Return client secret for frontend
      res.json({
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        rideId: rideId
      });

    } catch (error) {
      console.error("🔴 Payment intent creation error:", error);
      
      if (error instanceof Stripe.errors.StripeError) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: "Failed to create payment intent" });
    }
  });

  // Other payment-related routes can be added here
  app.get("/api/payment-methods", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Get user's payment methods from Stripe
      const user = req.user;
      if (!user?.stripeCustomerId) {
        return res.json({ paymentMethods: [] });
      }

      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'card',
      });

      res.json({ paymentMethods: paymentMethods.data });
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      res.status(500).json({ error: "Failed to fetch payment methods" });
    }
  });
}
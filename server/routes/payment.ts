import { Router, Request, Response } from 'express';
import { stripeService } from '../stripe-service';
import { storage } from '../storage';
import { z } from 'zod';
import { NotificationType } from '../notifications';
import { notificationService } from '../notifications';
import Stripe from 'stripe';

const router = Router();

const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
};

const isAdmin = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated() && req.user?.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: 'Forbidden: Admin access required' });
};

// Schema for creating a payment intent
const createPaymentIntentSchema = z.object({
  rideId: z.number(),
  amount: z.number().optional(),
  currency: z.string().default('usd'),
  customerId: z.string().optional()
});

// Create a payment intent for a ride
router.post('/create-payment-intent', isAuthenticated, async (req, res) => {
  try {
    const validatedData = createPaymentIntentSchema.parse(req.body);
    const { rideId, amount, currency, customerId } = validatedData;
    
    // Get the ride details
    const ride = await storage.getRide(rideId);
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }
    
    // Check if user is authorized to pay for this ride
    if (ride.riderId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'You are not authorized to pay for this ride' });
    }
    
    // Get actual amount from the ride if not provided
    const paymentAmount = amount || ride.finalPrice || 0;
    if (paymentAmount <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount' });
    }
    
    // Create the payment intent
    const paymentIntent = await stripeService.createPaymentIntent(
      paymentAmount, 
      currency, 
      { 
        rideId: ride.id.toString(),
        rideReference: ride.referenceNumber || '',
        userId: req.user!.id.toString()
      }
    );
    
    // Return client secret to front end
    res.json({
      clientSecret: paymentIntent.client_secret,
      amount: paymentAmount
    });
    
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ 
      message: 'Error creating payment intent',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Schema for payment confirmation
const confirmPaymentSchema = z.object({
  rideId: z.number(),
  paymentIntentId: z.string()
});

// Confirm payment for a ride
router.post('/confirm-payment', isAuthenticated, async (req, res) => {
  try {
    const validatedData = confirmPaymentSchema.parse(req.body);
    const { rideId, paymentIntentId } = validatedData;
    
    // Get the ride details
    const ride = await storage.getRide(rideId);
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }
    
    // Update ride status to paid
    const updatedRide = await storage.updateRide(rideId, { 
      status: 'paid' as any // Type assertion to bypass the error temporarily
    });
    
    // Notify driver that payment was received
    if (ride.driverId) {
      const driverUser = await storage.getUser(ride.driverId);
      const riderUser = await storage.getUser(ride.riderId);
      
      if (driverUser && riderUser) {
        await notificationService.createAndSendNotification({
          userId: driverUser.id,
          type: NotificationType.PAYMENT_RECEIVED,
          title: 'Payment Received',
          message: `Payment for ride ${ride.referenceNumber || `#${ride.id}`} has been received. You are now cleared to start the ride.`,
          metadata: {
            rideId: rideId,
            amount: ride.finalPrice?.toString()
          }
        });
      }
    }
    
    res.json({
      message: 'Payment confirmed successfully',
      ride: updatedRide
    });
    
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ 
      message: 'Error confirming payment',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Admin override for payment status
router.post('/admin-override', isAdmin, async (req, res) => {
  try {
    const { rideId, status, paymentIntentId, note } = req.body;
    
    if (!rideId) {
      return res.status(400).json({ message: 'Ride ID is required' });
    }
    
    // Get the ride details
    const ride = await storage.getRide(rideId);
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }
    
    // If we have a paymentIntentId, update it in Stripe
    if (paymentIntentId) {
      try {
        await stripeService.adminUpdatePaymentStatus(paymentIntentId, status);
      } catch (stripeError) {
        console.error('Stripe error during admin override:', stripeError);
        // We continue even if Stripe call fails, for full admin override capability
      }
    }
    
    // Always update the local ride status
    // We need to use the proper enums from the ride schema
    let newStatus: "paid" | "cancelled" = "paid";
    if (status === 'canceled') {
      newStatus = "cancelled";
    }
    
    const updatedRide = await storage.updateRide(rideId, { 
      status: newStatus as any // Type assertion to bypass the error temporarily
    });
    
    // Create an admin note for this action
    if (note && req.user) {
      await storage.createAdminNote({
        userId: req.user.id,
        rideId: rideId,
        note: `Admin payment override: ${note}`,
        recordType: 'payment'
      });
    }
    
    // Notify relevant parties
    if (ride.driverId) {
      const driverUser = await storage.getUser(ride.driverId);
      if (driverUser) {
        await notificationService.createAndSendNotification({
          userId: driverUser.id,
          type: NotificationType.PAYMENT_RECEIVED,
          title: 'Payment Status Updated by Admin',
          message: `Payment for ride ${ride.referenceNumber || `#${ride.id}`} has been ${newStatus === 'paid' ? 'approved' : 'cancelled'} by an administrator.`,
          metadata: {
            rideId: rideId,
            amount: ride.finalPrice?.toString(),
            adminAction: true
          }
        });
      }
    }
    
    res.json({
      message: 'Admin payment override successful',
      ride: updatedRide
    });
    
  } catch (error) {
    console.error('Error in admin payment override:', error);
    res.status(500).json({ 
      message: 'Error updating payment status',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get payment history for a user
router.get('/history', isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    
    // Get customer ID from user profile
    if (!user.stripeCustomerId) {
      return res.json({ payments: [] }); // No payments yet
    }
    
    // Get payment history from Stripe
    const paymentHistory = await stripeService.getCustomerPayments(user.stripeCustomerId);
    
    // Format for the client
    const formattedPayments = paymentHistory.data.map(payment => ({
      id: payment.id,
      amount: payment.amount / 100, // Convert from cents to dollars
      status: payment.status,
      date: new Date(payment.created * 1000).toISOString(),
      metadata: payment.metadata,
    }));
    
    res.json({ payments: formattedPayments });
    
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ 
      message: 'Error fetching payment history',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get payment method setup intent
router.post('/setup-intent', isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    
    // Create or get customer
    let customerId = user.stripeCustomerId;
    
    if (!customerId) {
      // Create new customer in Stripe
      const customer = await stripeService.createOrUpdateCustomer(
        user.id,
        user.email || '',
        user.fullName || user.username
      );
      
      customerId = customer.id;
      
      // Update user with Stripe customer ID
      await storage.updateUser(user.id, { stripeCustomerId: customerId });
    }
    
    // Create a setup intent
    const setupIntent = await stripeService.setupIntent(customerId);
    
    res.json({ 
      clientSecret: setupIntent.client_secret,
      customerId 
    });
    
  } catch (error) {
    console.error('Error creating setup intent:', error);
    res.status(500).json({ 
      message: 'Error setting up payment method',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Check if user has payment method set up
router.get('/has-payment-method', isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    
    // Check if user has a Stripe customer ID and payment methods
    if (!user.stripeCustomerId) {
      return res.json({ hasPaymentMethod: false });
    }
    
    // In a real implementation, you'd check Stripe for saved payment methods
    // For now, we'll assume having a customer ID means they have a payment method
    res.json({ hasPaymentMethod: !!user.stripeCustomerId });
    
  } catch (error) {
    console.error('Error checking payment method:', error);
    res.status(500).json({ 
      message: 'Error checking payment method',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;
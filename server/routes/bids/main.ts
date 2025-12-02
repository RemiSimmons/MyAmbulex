import { Router } from 'express';
import type { Request, Response } from 'express';
import { storage } from '../../storage';
import { isAuthenticated, hasRole } from '../../middleware/auth';
import { requireLegalAgreements } from '../../middleware/legal-agreement-middleware';
import { notificationService } from '../../notifications';
import { z } from 'zod';

const router = Router();

// Get bids for a specific ride (authenticated users only)
router.get('/api/bids/ride/:rideId', isAuthenticated, async (req, res) => {
  try {
    const rideId = parseInt(req.params.rideId);
    const userId = req.user!.id;

    if (isNaN(rideId)) {
      return res.status(400).json({ error: 'Invalid ride ID' });
    }

    // Get the ride to verify access permissions
    const ride = await storage.getRide(rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    // Only allow riders to see bids on their own rides, and drivers to see their own bids
    const userRole = req.user!.role;
    if (userRole === 'rider' && ride.riderId !== userId) {
      return res.status(403).json({ error: 'You can only view bids on your own rides' });
    }

    // Get all bids for the ride
    const bids = await storage.getRideBids(rideId);
    console.log(`🔍 GET /api/bids/ride/${rideId} - Found ${bids?.length || 0} bids for user ${userId} (${userRole})`);
    
    // If user is a driver, only return their own bids
    const filteredBids = userRole === 'driver' 
      ? bids.filter(bid => bid.driverId === userId)
      : bids;

    console.log(`🔍 Returning ${filteredBids?.length || 0} bids after filtering`);
    res.json(filteredBids);
  } catch (error) {
    console.error('Error fetching bids for ride:', error);
    res.status(500).json({ error: 'Failed to fetch bids' });
  }
});

// Get bid history for a specific bid (authenticated users only)
router.get('/api/bids/:bidId/history', isAuthenticated, async (req, res) => {
  try {
    const bidId = parseInt(req.params.bidId);
    const userId = req.user!.id;

    if (isNaN(bidId)) {
      return res.status(400).json({ error: 'Invalid bid ID' });
    }

    // Get the bid to verify access permissions
    const bid = await storage.getBid(bidId);
    if (!bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    // Get the related ride to check permissions
    const ride = await storage.getRide(bid.rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Related ride not found' });
    }

    // Only allow riders to see bid history on their own rides, and drivers to see their own bid history
    const userRole = req.user!.role;
    if (userRole === 'rider' && ride.riderId !== userId) {
      return res.status(403).json({ error: 'You can only view bid history on your own rides' });
    }
    if (userRole === 'driver' && bid.driverId !== userId) {
      return res.status(403).json({ error: 'You can only view your own bid history' });
    }

    // Get the bid history
    const bidHistory = await storage.getBidHistory(bidId);
    console.log(`🔍 GET /api/bids/${bidId}/history - Found ${bidHistory?.length || 0} history items for user ${userId} (${userRole})`);
    
    res.json(bidHistory);
  } catch (error) {
    console.error('Error fetching bid history:', error);
    res.status(500).json({ error: 'Failed to fetch bid history' });
  }
});

// Create a new bid (drivers only)
router.post('/api/bids', isAuthenticated, hasRole('driver'), requireLegalAgreements, async (req, res) => {
  try {
    const driverId = req.user!.id;
    const { rideId, amount, message, estimatedDuration } = req.body;
    
    console.log(`🚗 BID START: Driver ID: ${driverId}, Ride ID: ${rideId}, Amount: ${amount}`);

    // Validate required fields
    if (!rideId || !amount) {
      return res.status(400).json({ error: 'Ride ID and amount are required' });
    }

    // Check if ride exists and is available for bidding
    const ride = await storage.getRide(rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.status !== 'requested') {
      return res.status(400).json({ error: 'Ride is not available for bidding' });
    }

    // Check if driver has necessary permissions
    console.log(`🚗 Checking driver with user ID: ${driverId}`);
    const driver = await storage.getDriverDetailsByUserId(driverId);
    console.log(`🚗 Driver lookup result:`, driver ? 'Found' : 'Not found');
    if (!driver) {
      console.log(`🚗 ERROR: Driver not found for user ID: ${driverId}`);
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Check if driver already has an active (non-withdrawn) bid on this ride
    const existingBid = await storage.getDriverBidForRide(driverId, rideId);
    console.log(`🚗 Existing bid check for driver ${driverId} on ride ${rideId}:`, existingBid ? `Found bid ${existingBid.id} with status ${existingBid.status}` : 'No active bid found');
    if (existingBid) {
      return res.status(400).json({ error: 'You have already bid on this ride' });
    }

    // Create the bid
    const bid = await storage.createBid({
      driverId,
      rideId,
      amount: parseFloat(amount),
      message: message || '',
      estimatedDuration: estimatedDuration || null,
      status: 'pending'
    });

    console.log('Bid created successfully:', bid);
    
    // Send notification to rider about the new bid
    try {
      await notificationService.sendNewBidNotification(bid, ride);
      console.log(`📧 NEW BID NOTIFICATION: Sent to rider ${ride.riderId} for bid ${bid.id}`);
    } catch (notificationError) {
      console.error('Failed to send bid notification:', notificationError);
      // Don't fail the bid creation if notification fails
    }
    
    res.status(201).json(bid);
  } catch (error) {
    console.error('Error creating bid:', error);
    res.status(500).json({ error: 'Failed to create bid' });
  }
});

// Driver accepts their own bid (after rider selection)
router.post('/api/bids/:bidId/driver-accept', isAuthenticated, hasRole('driver'), requireLegalAgreements, async (req, res) => {
  try {
    const bidId = parseInt(req.params.bidId);
    const driverId = req.user!.id;

    // Get the bid
    const bid = await storage.getBid(bidId);
    if (!bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    // Check if this is the driver's bid
    if (bid.driverId !== driverId) {
      return res.status(403).json({ error: 'You can only accept your own bids' });
    }

    // Check if bid is selected by rider
    if (bid.status !== 'selected') {
      return res.status(400).json({ error: 'Bid must be selected by rider first' });
    }

    // Get the ride
    const ride = await storage.getRide(bid.rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Associated ride not found' });
    }

    // Update bid status to accepted
    await storage.updateBidStatus(bidId, 'accepted');

    // Update ride status to scheduled
    await storage.updateRideStatus(bid.rideId, 'scheduled');

    console.log(`Driver ${driverId} accepted bid ${bidId}`);
    res.json({ success: true, message: 'Bid accepted successfully' });
  } catch (error) {
    console.error('Error accepting bid:', error);
    res.status(500).json({ error: 'Failed to accept bid' });
  }
});

// Rider accepts a bid with automatic payment
router.post('/api/bids/:bidId/accept', isAuthenticated, hasRole('rider'), requireLegalAgreements, async (req, res) => {
  try {
    const bidId = parseInt(req.params.bidId);
    const riderId = req.user!.id;

    console.log("🔵 Bid acceptance started:", {
      bidId: bidId,
      riderId: riderId,
      timestamp: new Date().toISOString()
    });

    // Get the bid
    const bid = await storage.getBid(bidId);
    if (!bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    // Get the ride and verify ownership
    const ride = await storage.getRide(bid.rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Associated ride not found' });
    }

    if (ride.riderId !== riderId) {
      return res.status(403).json({ error: 'You can only accept bids on your own rides' });
    }

    // Check if bid is still pending
    if (bid.status !== 'pending') {
      return res.status(400).json({ error: 'Bid is no longer available for acceptance' });
    }

    // Get user to check for Stripe customer ID and payment method
    const user = req.user!;
    const userProfile = await storage.getUserProfile(riderId);
    
    if (!user.stripeCustomerId || !userProfile?.defaultPaymentMethodId) {
      console.log("❌ Payment method missing for rider", riderId);
      return res.status(400).json({ 
        error: 'Payment method required',
        code: 'PAYMENT_METHOD_REQUIRED',
        message: 'Please add a payment method before accepting bids'
      });
    }

    console.log("💳 Processing automatic payment:", {
      riderId: riderId,
      bidAmount: bid.amount,
      stripeCustomerId: user.stripeCustomerId,
      paymentMethodId: userProfile.defaultPaymentMethodId
    });

    try {
      // Import Stripe here to avoid circular dependency
      const Stripe = await import('stripe');
      const stripe = new Stripe.default(process.env.STRIPE_SECRET_KEY || "", {
        apiVersion: "2024-12-18.acacia",
      });

      // Create payment intent with automatic payment
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(bid.amount * 100), // Convert to cents
        currency: 'usd',
        customer: user.stripeCustomerId,
        payment_method: userProfile.defaultPaymentMethodId,
        confirmation_method: 'automatic',
        confirm: true,
        description: `MyAmbulex Ride Payment - Ride #${ride.referenceNumber}`,
        metadata: {
          rideId: ride.id.toString(),
          bidId: bidId.toString(),
          riderId: riderId.toString(),
          driverId: bid.driverId.toString()
        }
      });

      console.log("💳 Payment processing result:", {
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount
      });

      if (paymentIntent.status === 'succeeded') {
        // Payment successful - complete the transaction
        console.log("✅ Payment successful, completing ride acceptance");

        // Update bid status to accepted (payment completed)
        await storage.updateBidStatus(bidId, 'accepted');

        // Update ride status to scheduled and set the final price
        await storage.updateRideStatus(bid.rideId, 'scheduled');
        await storage.updateRide(bid.rideId, { 
          finalPrice: bid.amount,
          driverId: bid.driverId 
        });

        // Reject all other bids for this ride
        const allBids = await storage.getRideBids(bid.rideId);
        for (const otherBid of allBids) {
          if (otherBid.id !== bidId && otherBid.status === 'pending') {
            await storage.updateBidStatus(otherBid.id, 'rejected');
          }
        }

        console.log(`✅ Rider ${riderId} accepted bid ${bidId} with automatic payment - ride scheduled`);
        
        res.json({ 
          success: true, 
          message: 'Payment successful! Your ride has been scheduled.',
          paymentIntentId: paymentIntent.id,
          rideStatus: 'scheduled'
        });
      } else {
        // Payment requires additional action or failed
        console.log("⚠️ Payment requires additional action:", paymentIntent.status);
        
        res.json({
          success: false,
          requiresAction: true,
          paymentIntent: {
            id: paymentIntent.id,
            client_secret: paymentIntent.client_secret,
            status: paymentIntent.status
          },
          message: 'Payment requires additional verification'
        });
      }

    } catch (paymentError: any) {
      console.error("❌ Payment processing failed:", paymentError);
      
      // Don't accept the bid if payment fails
      res.status(400).json({
        error: 'Payment failed',
        message: paymentError.message || 'Unable to process payment at this time',
        code: 'PAYMENT_FAILED'
      });
    }
  } catch (error) {
    console.error('Error accepting bid:', error);
    res.status(500).json({ error: 'Failed to accept bid' });
  }
});

// Create counter offer
router.post('/api/bids/:bidId/counter', isAuthenticated, requireLegalAgreements, async (req, res) => {
  try {
    const bidId = parseInt(req.params.bidId);
    const userId = req.user!.id;
    const { amount, message } = req.body;

    // Validate required fields
    if (!amount) {
      return res.status(400).json({ error: 'Amount is required for counter offer' });
    }

    // Get the bid
    const bid = await storage.getBid(bidId);
    if (!bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    // Get the ride
    const ride = await storage.getRide(bid.rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Associated ride not found' });
    }

    // Check if user is authorized (either the rider or the driver)
    if (req.user!.id !== ride.riderId && req.user!.id !== bid.driverId) {
      return res.status(403).json({ error: 'You are not authorized to make counter offers on this bid' });
    }

    // Check counter offer limit
    const existingCounterOffers = await storage.getCounterOffers(bidId);
    if (existingCounterOffers.length >= 3) {
      return res.status(400).json({ error: 'Maximum counter offers reached for this bid' });
    }

    // Determine counter party based on user role
    const counterParty = req.user!.id === ride.riderId ? 'rider' : 'driver';
    
    // Create counter offer
    const counterOffer = await storage.createCounterOffer(
      bidId,
      counterParty,
      parseFloat(amount),
      message || undefined
    );

    // Update bid status to selected if counter offer is from rider
    if (req.user!.id === ride.riderId) {
      await storage.updateBidStatus(bidId, 'selected');
    }

    console.log('Counter offer created:', counterOffer);
    res.status(201).json(counterOffer);
  } catch (error) {
    console.error('Error creating counter offer:', error);
    res.status(500).json({ error: 'Failed to create counter offer' });
  }
});

// Withdraw/cancel a bid (drivers only)
router.delete('/api/bids/:bidId', isAuthenticated, hasRole('driver'), async (req, res) => {
  try {
    const bidId = parseInt(req.params.bidId);
    const driverId = req.user!.id;

    console.log(`🚗 WITHDRAW BID: Driver ID: ${driverId}, Bid ID: ${bidId}`);

    // Get the bid
    const bid = await storage.getBid(bidId);
    if (!bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    // Check if this is the driver's bid
    if (bid.driverId !== driverId) {
      return res.status(403).json({ error: 'You can only withdraw your own bids' });
    }

    // Check if bid can be withdrawn (only pending or countered bids can be withdrawn)
    if (!['pending', 'countered'].includes(bid.status)) {
      return res.status(400).json({ error: 'Cannot withdraw bid with status: ' + bid.status });
    }

    // Update bid status to withdrawn
    await storage.updateBidStatus(bidId, 'withdrawn');

    console.log(`Driver ${driverId} withdrew bid ${bidId}`);
    res.json({ success: true, message: 'Bid withdrawn successfully' });
  } catch (error) {
    console.error('Error withdrawing bid:', error);
    res.status(500).json({ error: 'Failed to withdraw bid' });
  }
});

export default router;
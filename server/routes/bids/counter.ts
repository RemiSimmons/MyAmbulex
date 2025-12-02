import { Router } from 'express';
import type { Request, Response } from 'express';
import { storage } from '../../storage';
import { isAuthenticated } from '../../middleware/auth';

const router = Router();

// Get counter offer count for a bid
router.get('/api/bids/:bidId/counter-count', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { bidId } = req.params;
    
    const bid = await storage.getBid(parseInt(bidId));
    if (!bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    // Check if user is authorized to view this bid
    const ride = await storage.getRide(bid.rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Related ride not found' });
    }

    // Allow access if user is the rider (who created the ride) or the driver (who made the bid)
    if (req.user.id !== ride.userId && req.user.id !== bid.driverId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get counter offer count
    const counterOffers = await storage.getCounterOffers(parseInt(bidId));
    
    res.json({
      success: true,
      bidId: parseInt(bidId),
      counterOfferCount: counterOffers.length,
      counterOffers: counterOffers.map(offer => ({
        id: offer.id,
        amount: offer.amount,
        message: offer.message,
        createdAt: offer.createdAt,
        createdBy: offer.createdBy
      }))
    });
  } catch (error) {
    console.error('Error fetching counter offer count:', error);
    res.status(500).json({ error: 'Failed to fetch counter offer count' });
  }
});

export default router;
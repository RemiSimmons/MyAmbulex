import { Router } from 'express';
import type { Request, Response } from 'express';
import { storage } from '../../storage';
import { automaticPaymentService } from '../../automatic-payment-service';

const router = Router();

// Process payment for a ride
router.post('/rides/:rideId/process-payment', async (req: Request, res: Response) => {
  try {
    const { rideId } = req.params;
    const { paymentMethodId } = req.body;
    
    const ride = await storage.getRide(parseInt(rideId));
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    // Process payment using automatic payment service
    const paymentResult = await automaticPaymentService.processRidePayment(
      parseInt(rideId),
      paymentMethodId
    );

    if (paymentResult.success) {
      res.json({
        success: true,
        message: 'Payment processed successfully',
        paymentIntent: paymentResult.paymentIntent
      });
    } else {
      res.status(400).json({
        success: false,
        error: paymentResult.error || 'Payment processing failed'
      });
    }
  } catch (error) {
    console.error('Error processing ride payment:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

// Retry payment for a ride
router.post('/rides/:rideId/retry-payment', async (req: Request, res: Response) => {
  try {
    const { rideId } = req.params;
    const { paymentMethodId } = req.body;
    
    const ride = await storage.getRide(parseInt(rideId));
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    // Retry payment using automatic payment service
    const paymentResult = await automaticPaymentService.retryRidePayment(
      parseInt(rideId),
      paymentMethodId
    );

    if (paymentResult.success) {
      res.json({
        success: true,
        message: 'Payment retry successful',
        paymentIntent: paymentResult.paymentIntent
      });
    } else {
      res.status(400).json({
        success: false,
        error: paymentResult.error || 'Payment retry failed'
      });
    }
  } catch (error) {
    console.error('Error retrying ride payment:', error);
    res.status(500).json({ error: 'Failed to retry payment' });
  }
});

export default router;
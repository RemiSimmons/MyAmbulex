import { Router } from 'express';
import type { Request, Response } from 'express';
import { createPaypalOrder, capturePaypalOrder, loadPaypalDefault } from '../../paypal';

const router = Router();

// PayPal setup endpoint
router.get('/api/paypal/setup', async (req: Request, res: Response) => {
  res.json(await loadPaypalDefault());
});

// Create PayPal order
router.post('/api/paypal/order', async (req: Request, res: Response) => {
  res.json(await createPaypalOrder(req.body));
});

// Capture PayPal order
router.post('/api/paypal/order/:orderID/capture', async (req: Request, res: Response) => {
  res.json(await capturePaypalOrder(req.params.orderID));
});

export default router;
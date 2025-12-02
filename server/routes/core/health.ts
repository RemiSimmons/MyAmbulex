import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Health check endpoint
router.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Test auth endpoint
router.get('/api/test-auth', (req: Request, res: Response) => {
  if (req.isAuthenticated()) {
    res.json({ 
      authenticated: true, 
      user: req.user,
      session: req.session
    });
  } else {
    res.status(401).json({ 
      authenticated: false, 
      message: 'Not authenticated' 
    });
  }
});

// Document test endpoint
router.get('/api/document-test', (req: Request, res: Response) => {
  res.send('<h1>Document Test</h1><p>This is a test document endpoint.</p>');
});

export default router;
// Load environment variables from .env file
import 'dotenv/config';

import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import path from "path";
import { registerRoutes } from "./routes/index";
import { setupStripeSetupRoutes } from "./routes/stripe-setup";
import { setupStripeWebhookRoutes } from "./routes/stripe-webhook";
import { setupVite, serveStatic, log } from "./vite";
import { runMigrations } from "./migrations";
import { setupAuth } from "./auth";
import { rideReminderService } from "./ride-reminder-service";
import { RideExpirationService } from "./services/ride-expiration-service";
import { 
  generalLimiter, 
  authLimiter, 
  paymentLimiter, 
  securityHeaders, 
  sanitizeInput, 
  csrfProtection, 
  requestLogger, 
  errorHandler 
} from "./middleware/security";

const app = express();

// Security middleware stack
app.use(securityHeaders);
app.use(requestLogger);

// Remove debug middleware for cleaner logs

// Apply general rate limiting only to API routes
app.use('/api', generalLimiter);
app.use(sanitizeInput);

// Add middleware to handle HTTPS redirection for custom domain
app.use((req, res, next) => {
  const host = req.get('host');

  // Only redirect myambulex.com host in production, not in Replit preview
  if (process.env.NODE_ENV === 'production' && 
      host && 
      host.includes('myambulex.com') && 
      req.protocol === 'http') {
    const secureUrl = `https://${host}${req.originalUrl}`;
    return res.redirect(301, secureUrl);
  }

  next();
});

// Static file serving with proper MIME types for video files
app.use('/attached_assets', express.static('attached_assets', {
  setHeaders: (res, path) => {
    if (path.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'video/mp4');
      // Mobile compatibility headers - removed problematic headers
      res.setHeader('Cache-Control', 'public, max-age=86400');
      // Remove COEP/CORP headers that can cause mobile issues
    } else if (path.endsWith('.mov')) {
      res.setHeader('Content-Type', 'video/quicktime');
    } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    }
    // Enable range requests for video streaming (essential for mobile)
    res.setHeader('Accept-Ranges', 'bytes');
    // Simplified CORS headers for better mobile compatibility
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
  }
}));

// Enhanced video streaming endpoint for mobile support
app.get('/attached_assets/*.mp4', (req: Request, res: Response) => {
  const fs = require('fs');
  const path = require('path');
  
  const videoPath = path.join(process.cwd(), req.path);
  
  // Check if file exists
  if (!fs.existsSync(videoPath)) {
    console.error(`Video file not found: ${videoPath}`);
    return res.status(404).json({ error: 'Video not found' });
  }
  
  try {
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    // Log mobile video request
    console.log(`📱 Mobile video request: ${req.path}, Range: ${range || 'full'}, User-Agent: ${req.headers['user-agent']?.substring(0, 50)}`);
    
    if (range) {
      // Parse range header - mobile browsers often use this for progressive loading
      const parts = range.replace(/bytes=/, "").split("-");
      let start = parseInt(parts[0], 10) || 0;
      let end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 1024 * 1024, fileSize - 1); // 1MB chunks max for mobile
      
      // Ensure valid range
      if (start >= fileSize || end >= fileSize) {
        return res.status(416).json({ error: 'Range not satisfiable' });
      }
      
      const chunksize = (end - start) + 1;
      
      // Create read stream for the requested range
      const file = fs.createReadStream(videoPath, { start, end });
      
      // Enhanced headers for mobile compatibility
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Cache-Control': 'public, max-age=86400',
        'Vary': 'Accept-Encoding',
        // Mobile-specific headers
        'X-Content-Type-Options': 'nosniff'
      });
      
      file.on('error', (error: any) => {
        console.error('Video stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Video streaming error' });
        }
      });
      
      file.pipe(res);
      
    } else {
      // No range requested - for small files or initial metadata requests
      const headers = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff'
      };
      
      res.writeHead(200, headers);
      
      const stream = fs.createReadStream(videoPath);
      stream.on('error', (error: any) => {
        console.error('Video file stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Video file error' });
        }
      });
      
      stream.pipe(res);
    }
    
  } catch (error) {
    console.error('Video serving error:', error);
    res.status(500).json({ error: 'Server error serving video' });
  }
});

// Stripe webhooks must be registered BEFORE express.json() to preserve raw body
setupStripeWebhookRoutes(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Apply rate limiting to specific routes - MUST be before route mounting
app.use('/api/login', authLimiter); // SECURITY FIX: Rate limit login attempts (actual route used by frontend)
app.use('/api/register', authLimiter); // SECURITY FIX: Rate limit registration attempts
app.use('/api/auth/google', authLimiter); // SECURITY FIX: Rate limit OAuth attempts
app.use('/api/stripe', paymentLimiter);
app.use('/api/paypal', paymentLimiter);
app.use(csrfProtection);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Run database migrations before setting up routes
    await runMigrations();
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    // Continue with server startup even if migrations fail
  }

  // Setup authentication before registering routes
  await setupAuth(app);
  console.log('Authentication setup completed successfully');
  
  // Register API routes FIRST to ensure they have priority over Vite catch-all routes
  registerRoutes(app);
  
  // Register Stripe setup routes
  setupStripeSetupRoutes(app);
  
  // Add middleware to protect API routes from being overridden by Vite
  app.use('/api/*', (req, res, next) => {
    // Ensure Content-Type is set correctly for API responses
    if (!res.headersSent && !res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', 'application/json');
    }
    next();
  });
  
  // Serve PWA files from public directory BEFORE Vite middleware
  // This prevents Vite's catch-all from intercepting sw.js and manifest.json
  app.use(express.static(path.resolve(process.cwd(), 'public'), {
    index: false, // Don't auto-serve index.html
    setHeaders: (res, filepath) => {
      // Service workers must not be cached long-term
      if (filepath.endsWith('sw.js')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Content-Type', 'application/javascript');
      } else if (filepath.endsWith('manifest.json')) {
        res.setHeader('Content-Type', 'application/json');
      } else if (filepath.endsWith('offline.html')) {
        res.setHeader('Content-Type', 'text/html');
      }
    }
  }));
  
  // Create HTTP server instance
  const server = createServer(app);
  
  // Setup vite in development and serve static in production AFTER API routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Add session diagnostic middleware
  try {
    const { sessionDiagnostic } = await import('./middleware/session-diagnostic');
    app.use(sessionDiagnostic);
  } catch (sessionDiagnosticError: any) {
    console.warn('Session diagnostic middleware not available:', sessionDiagnosticError.message);
  }

  // Add session validation middleware
  app.use((req, res, next) => {
    // Ensure session exists and is properly initialized
    if (!req.session) {
      console.error("Session middleware failed to create session object");
      return res.status(500).json({ message: "Session initialization failed" });
    }

    next();
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    console.error('Express error handler:', err);
  });

  // Use dynamic port allocation to avoid conflicts
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // Add graceful shutdown handlers
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  // Initialize ride expiration service
  const rideExpirationService = new RideExpirationService();

  // Simple server startup without fallback ports
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`Server running on port ${port}`);
    console.log('MyAmbulex server started successfully - WebSocket temporarily disabled');
    console.log('🔔 Ride reminder service initialized and running');
    console.log('🕒 Ride expiration service initialized and running');
  });
})().catch((error) => {
  console.error('Fatal server startup error:', error);
  process.exit(1);
});
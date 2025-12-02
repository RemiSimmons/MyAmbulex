import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { runMigrations } from "./migrations";
import { createServer } from 'http';
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

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Apply rate limiting to specific routes
app.use('/auth', authLimiter);
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

  // Create HTTP server instance
  const server = createServer(app);

  // Register routes (WebSocket completely removed - using polling only)
  const routesRegisteredServer = await registerRoutes(app);

  // Add session diagnostic middleware
  try {
    const { sessionDiagnostic } = await import('./middleware/session-diagnostic');
    app.use(sessionDiagnostic);
  } catch (sessionDiagnosticError) {
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

  // Setup vite in development and serve static in production
  if (app.get("env") === "development") {
    await setupVite(app, routesRegisteredServer);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  const port = 5000;

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

  // Handle port conflicts gracefully
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Attempting to free it...`);
      console.log('Please wait 5 seconds for cleanup, then try running again.');
      process.exit(1);
    } else {
      console.error('Server error:', err);
      process.exit(1); 
    }
  });

  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`Server running on port ${port}`);
    console.log('MyAmbulex server started successfully - WebSocket temporarily disabled');
  });
})().catch((error) => {
  console.error('Fatal server startup error:', error);
  process.exit(1);
});
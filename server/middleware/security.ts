import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

// Rate limiting configurations - exclude development assets and API polling
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Much higher limit for polling system
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for development assets, static files, and API polling
    return req.url.includes('/@') || 
           req.url.includes('.js') || 
           req.url.includes('.css') || 
           req.url.includes('.ts') || 
           req.url.includes('.tsx') || 
           req.url.includes('/src/') ||
           req.url.includes('/node_modules/') ||
           req.url.includes('vite') ||
           req.url.includes('.map') ||
           req.url.startsWith('/assets/') ||
           req.url.startsWith('/api/notifications') ||
           req.url.startsWith('/api/rides') ||
           req.url.startsWith('/api/bids');
  }
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

export const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 payment requests per hour
  message: {
    error: 'Too many payment attempts, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security headers middleware - development-friendly CSP
export const securityHeaders = helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'", "https://js.stripe.com", "https://maps.googleapis.com"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://maps.googleapis.com"],
      frameSrc: ["https://js.stripe.com", "https://hooks.stripe.com"],
    },
  } : false, // Disable CSP in development to allow Vite
  crossOriginEmbedderPolicy: false,
});

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize common XSS patterns
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }
    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = Array.isArray(obj) ? [] : {};
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

// CSRF protection for state-changing operations
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for GET requests and API endpoints with proper authentication
  if (req.method === 'GET' || req.path.startsWith('/api/webhooks/')) {
    return next();
  }

  // For authenticated users, check session consistency
  if (req.isAuthenticated?.() && req.user) {
    const sessionUserId = req.user.id;
    const headerUserId = req.headers['x-user-id'];
    
    if (headerUserId && parseInt(headerUserId as string) !== sessionUserId) {
      return res.status(403).json({ error: 'Invalid session' });
    }
  }

  next();
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous',
      timestamp: new Date().toISOString()
    };

    // Log slow requests or errors
    if (duration > 1000 || res.statusCode >= 400) {
      console.warn('🐌 Slow/Error Request:', JSON.stringify(logData));
    }
  });

  next();
};

// Error handling middleware
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('🚨 Error:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });

  // Don't leak error details in production
  const isDev = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: isDev ? err.message : 'Internal server error',
    ...(isDev && { stack: err.stack })
  });
};

export default {
  generalLimiter,
  authLimiter,
  paymentLimiter,
  securityHeaders,
  sanitizeInput,
  csrfProtection,
  requestLogger,
  errorHandler
};
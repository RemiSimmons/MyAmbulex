
import { Request, Response, NextFunction } from 'express';

// Middleware to track session data between requests
export const sessionDiagnostic = (req: Request, res: Response, next: NextFunction) => {
  if (req.originalUrl.startsWith('/api/')) {
    console.log("🔍 SESSION_DIAGNOSTIC:", {
      url: req.originalUrl,
      method: req.method,
      sessionID: req.sessionID,
      hasSession: !!req.session,
      sessionData: req.session ? {
        keys: Object.keys(req.session),
        hasPassport: !!req.session.passport,
        passportUser: req.session.passport?.user || null,
        cookie: req.session.cookie ? {
          maxAge: req.session.cookie.maxAge,
          expires: req.session.cookie.expires,
          httpOnly: req.session.cookie.httpOnly,
          secure: req.session.cookie.secure,
          sameSite: req.session.cookie.sameSite
        } : null
      } : 'No session object',
      cookieHeader: req.headers.cookie ? 'present' : 'missing',
      userAgent: req.headers['user-agent']?.substring(0, 50) + '...'
    });
    
    // Check if this is a subsequent request after login
    if (req.session && req.session.passport && req.session.passport.user) {
      console.log("🔍 SESSION_DIAGNOSTIC: ✅ Valid authenticated session found");
    } else if (req.session && !req.session.passport) {
      console.log("🔍 SESSION_DIAGNOSTIC: ⚠️  Session exists but no passport data");
    } else if (!req.session) {
      console.log("🔍 SESSION_DIAGNOSTIC: ❌ No session object");
    }
  }
  
  next();
};

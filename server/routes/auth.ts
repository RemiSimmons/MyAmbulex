import { Router } from 'express';
import passport from 'passport';
import { storage } from '../storage';

const authRouter = Router();

// Login route
authRouter.post('/api/auth/login', (req, res, next) => {
  console.log('POST /api/auth/login - Login attempt:', {
    username: req.body.username,
    hasPassword: !!req.body.password,
    sessionBefore: {
      hasSession: !!req.session,
      sessionID: req.sessionID,
      isAuthenticated: req.isAuthenticated()
    }
  });

  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Login authentication error:', err); // Log detailed error server-side
      return res.status(500).json({
        success: false,
        message: 'An error occurred during login. Please try again.'
      }); // SECURITY FIX: Don't leak error details to client
    }

    if (!user) {
      console.log('Login authentication failed:', info);
      return res.status(401).json({
        success: false,
        message: info?.message || 'Authentication failed'
      });
    }

    // SECURITY FIX: Regenerate session to prevent session fixation attacks
    req.session.regenerate((regenerateErr) => {
      if (regenerateErr) {
        console.error('Session regeneration error:', regenerateErr);
        return res.status(500).json({
          success: false,
          message: 'Session security error'
        });
      }

      // Log the user in using passport
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error('Login session creation error:', loginErr);
          return res.status(500).json({
            success: false,
            message: 'Session creation error'
          });
        }

        console.log('✅ Login successful for user:', user.username);

        // Return success with user info
        return res.json({
          success: true,
          message: 'Authentication successful',
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            fullName: user.fullName || user.full_name,
            email: user.email
          },
          sessionAfter: {
            hasSession: !!req.session,
            sessionID: req.sessionID,
            isAuthenticated: req.isAuthenticated()
          }
        });
      });
    });
  })(req, res, next);
});

// Logout route
authRouter.post('/api/auth/logout', (req, res) => {
  console.log('POST /api/auth/logout - Logout attempt for user:', req.user?.username || 'anonymous');
  
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err); // Log detailed error server-side
      return res.status(500).json({
        success: false,
        message: 'An error occurred during logout. Please try again.'
      }); // SECURITY FIX: Don't leak error details
    }

    req.session.destroy((sessionErr) => {
      if (sessionErr) {
        console.error('Session destruction error:', sessionErr); // Log detailed error server-side
        return res.status(500).json({
          success: false,
          message: 'An error occurred during logout. Please try again.'
        }); // SECURITY FIX: Don't leak error details
      }

      res.clearCookie('myambulex.sid');
      console.log('✅ Logout successful');
      
      return res.json({
        success: true,
        message: 'Logout successful'
      });
    });
  });
});

// Google OAuth routes (only if configured)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  authRouter.get('/api/auth/google',
    (req, res, next) => {
      // Store role preference in session if provided
      const role = req.query.role as string;
      if (role && (role === 'rider' || role === 'driver')) {
        (req.session as any).oauthSignupRole = role;
        console.log('Storing OAuth signup role in session:', role);
      }
      next();
    },
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      state: true // Enable CSRF protection
    })
  );

  authRouter.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/auth?error=oauth_failed' }),
    async (req, res) => {
      console.log('✅ Google OAuth successful for user:', req.user?.email);
      
      const user = req.user as any;
      const signupRole = (req.session as any).oauthSignupRole;
      
      // Check if user needs onboarding (new user or incomplete profile)
      const isNewUser = !user.phone || user.phone === '';
      
      if (isNewUser) {
        // Update role if one was selected during signup
        if (signupRole && (signupRole === 'rider' || signupRole === 'driver')) {
          console.log('Updating new OAuth user role to:', signupRole);
          try {
            await storage.updateUser(user.id, { role: signupRole });
            user.role = signupRole; // Update the session user object
          } catch (err) {
            console.error('Failed to update user role:', err);
          }
        }
        
        // Clear the signup role from session
        delete (req.session as any).oauthSignupRole;
        
        // SECURITY FIX: Save session to emit cookie with OAuth-specific SameSite=None
        req.session.save((err) => {
          if (err) {
            console.error('Failed to save OAuth session:', err);
          }
          
          // SECURITY FIX: Reset cookie policy back to Lax for CSRF protection
          // OAuth needed SameSite=None, but now that auth is complete, restore default security
          if (req.session && req.session.cookie) {
            const isSecure = req.secure || 
                             req.headers['x-forwarded-proto'] === 'https' ||
                             (process.env.NODE_ENV === 'production' && req.protocol === 'https');
            req.session.cookie.sameSite = 'lax';
            req.session.cookie.secure = isSecure;
            console.log('🔐 OAuth complete - restored default cookie policy (SameSite=Lax)');
          }
          
          // New OAuth user needs to complete profile/onboarding
          console.log('New OAuth user - redirecting to onboarding');
          if (user.role === 'rider') {
            res.redirect('/rider/onboarding');
          } else if (user.role === 'driver') {
            res.redirect('/driver/onboarding');
          } else {
            // Fallback - let them complete profile
            res.redirect('/rider/onboarding');
          }
        });
      } else {
        // SECURITY FIX: Save session to emit cookie with OAuth-specific SameSite=None
        req.session.save((err) => {
          if (err) {
            console.error('Failed to save OAuth session:', err);
          }
          
          // SECURITY FIX: Reset cookie policy back to Lax for CSRF protection
          // OAuth needed SameSite=None, but now that auth is complete, restore default security
          if (req.session && req.session.cookie) {
            const isSecure = req.secure || 
                             req.headers['x-forwarded-proto'] === 'https' ||
                             (process.env.NODE_ENV === 'production' && req.protocol === 'https');
            req.session.cookie.sameSite = 'lax';
            req.session.cookie.secure = isSecure;
            console.log('🔐 OAuth complete - restored default cookie policy (SameSite=Lax)');
          }
          
          // Existing user - redirect to dashboard
          console.log('Existing OAuth user - redirecting to dashboard');
          if (user.role === 'rider') {
            res.redirect('/rider/dashboard');
          } else if (user.role === 'driver') {
            res.redirect('/driver/dashboard');
          } else if (user.role === 'admin') {
            res.redirect('/admin/dashboard');
          } else {
            res.redirect('/');
          }
        });
      }
    }
  );
  console.log('✅ Google OAuth routes registered');
} else {
  // Provide helpful error when OAuth is not configured
  authRouter.get('/api/auth/google', (req, res) => {
    console.log('⚠️  Google OAuth attempted but not configured');
    res.status(503).json({ 
      error: 'Google OAuth is not configured on this server',
      message: 'Please contact the administrator to enable Google sign-in'
    });
  });
}

// Health check endpoint to verify OAuth availability
authRouter.get('/api/auth/google/status', (req, res) => {
  res.json({ 
    available: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  });
});

export default authRouter;
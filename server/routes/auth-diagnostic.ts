import express from 'express';
import { storage } from '../storage';
import passport from 'passport';

const authDiagnosticRouter = express.Router();

export default authDiagnosticRouter;

/**
 * API endpoint to check the current auth status
 * This is for debugging authentication issues only
 */
authDiagnosticRouter.get('/api/auth-status', (req, res) => {
  // Collect diagnostic information without exposing sensitive data
  const authStatus = {
    isAuthenticated: req.isAuthenticated(),
    hasSession: !!req.session,
    hasSessionID: !!req.sessionID,
    sessionID: req.sessionID,
    sessionData: req.session ? {
      hasPassport: !!req.session.passport,
      passport: req.session.passport ? {
        hasUser: !!req.session.passport.user,
        userIdType: req.session.passport.user ? typeof req.session.passport.user : null,
        // Don't expose the actual user ID for security
        userIdPresent: req.session.passport.user ? 'present' : 'missing'
      } : null,
      cookie: req.session.cookie ? {
        originalMaxAge: req.session.cookie.originalMaxAge,
        expires: req.session.cookie.expires,
        secure: req.session.cookie.secure,
        httpOnly: req.session.cookie.httpOnly,
        path: req.session.cookie.path,
        sameSite: req.session.cookie.sameSite,
      } : null
    } : null,
    // Basic user info if authenticated
    user: req.user ? {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      fullName: req.user.fullName
    } : null
  };

  console.log('GET /api/auth-status - Auth Check:', {
    isAuthenticated: authStatus.isAuthenticated,
    hasSession: authStatus.hasSession,
    hasSessionID: authStatus.hasSessionID,
    sessionID: authStatus.sessionID
  });

  res.json(authStatus);
});

/**
 * API endpoint to inspect session health
 */
authDiagnosticRouter.get('/api/session-health', (req, res) => {
  // Only allow this in development
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Not available in production' });
  }

  const health = {
    sessionStore: {
      type: req.sessionStore.constructor.name,
      methods: Object.getOwnPropertyNames(Object.getPrototypeOf(req.sessionStore))
        .filter(name => typeof req.sessionStore[name] === 'function' && name !== 'constructor')
    },
    sessionCookieConfig: req.sessionStore.sessionCookieConfig,
    session: {
      exists: !!req.session,
      id: req.sessionID,
      regenerate: typeof req.session?.regenerate === 'function',
      destroy: typeof req.session?.destroy === 'function',
      reload: typeof req.session?.reload === 'function',
      touch: typeof req.session?.touch === 'function',
      save: typeof req.session?.save === 'function',
    },
    headers: {
      cookie: req.headers.cookie ? 'present' : 'missing',
      userAgent: req.headers['user-agent'],
    }
  };

  res.json(health);
});

/**
 * Direct login test endpoint
 * This endpoint allows testing the login functionality directly
 * Only available in development environment
 */
authDiagnosticRouter.post('/api/auth-test/login', (req, res, next) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Not available in production' });
  }
  
  const { username, password } = req.body;
  
  console.log('POST /api/auth-test/login - Test login attempt:', {
    username,
    hasPassword: !!password,
    sessionBefore: {
      hasSession: !!req.session,
      sessionID: req.sessionID,
      isAuthenticated: req.isAuthenticated()
    }
  });
  
  // Use the direct passport authenticate method for testing
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Auth test login error:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Authentication error',
        error: err.message
      });
    }
    
    if (!user) {
      console.log('Auth test login failed:', info);
      return res.status(401).json({ 
        success: false, 
        message: info?.message || 'Authentication failed'
      });
    }
    
    // Try to log the user in
    req.login(user, (loginErr) => {
      if (loginErr) {
        console.error('Auth test session error:', loginErr);
        return res.status(500).json({ 
          success: false, 
          message: 'Session creation error',
          error: loginErr.message
        });
      }
      
      console.log('Auth test login successful for user:', user.username);
      
      // Return success with session info
      return res.json({
        success: true,
        message: 'Authentication successful',
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          fullName: user.fullName
        },
        sessionAfter: {
          hasSession: !!req.session,
          sessionID: req.sessionID,
          isAuthenticated: req.isAuthenticated()
        }
      });
    });
  })(req, res, next);
});

/**
 * Simple login test to verify passport serialization
 */
authDiagnosticRouter.post('/api/auth-test/simple-login', (req, res, next) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Not available in production' });
  }

  const { username = 'testuser', password = 'password123' } = req.body;
  
  console.log('🧪 SIMPLE LOGIN TEST:', { username, hasPassword: !!password });
  
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('❌ Auth error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
    
    if (!user) {
      console.log('❌ Auth failed:', info);
      return res.status(401).json({ success: false, message: info?.message || 'Auth failed' });
    }
    
    console.log('✅ Auth successful, attempting req.login()...');
    
    req.login(user, (loginErr) => {
      if (loginErr) {
        console.error('❌ Login error:', loginErr);
        return res.status(500).json({ success: false, error: loginErr.message });
      }
      
      console.log('✅ req.login() completed, session state:', {
        isAuthenticated: req.isAuthenticated(),
        sessionPassport: req.session?.passport,
        userId: req.user?.id
      });
      
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('❌ Session save error:', saveErr);
          return res.status(500).json({ success: false, error: saveErr.message });
        }
        
        // Check if passport data is in session
        const hasPassportData = !!(req.session?.passport?.user);
        
        console.log('✅ Session saved, final verification:', {
          sessionID: req.sessionID,
          isAuthenticated: req.isAuthenticated(),
          hasPassportData,
          passportUser: req.session?.passport?.user
        });
        
        return res.json({
          success: true,
          message: hasPassportData ? 'Login successful with passport data' : 'Login successful but missing passport data',
          session: {
            id: req.sessionID,
            isAuthenticated: req.isAuthenticated(),
            hasPassportData,
            userId: req.user?.id,
            username: req.user?.username
          }
        });
      });
    });
  })(req, res, next);
});

/**
 * Session validation endpoint
 * Quick endpoint to validate current session without heavy diagnostics
 */
authDiagnosticRouter.get('/api/auth/validate-session', (req, res) => {
  const isValid = req.isAuthenticated() && !!req.user;
  
  if (isValid) {
    res.json({
      valid: true,
      user: {
        id: req.user!.id,
        username: req.user!.username,
        role: req.user!.role
      },
      sessionId: req.sessionID
    });
  } else {
    res.status(401).json({
      valid: false,
      message: "Session not authenticated"
    });
  }
});

/**
 * Manual session creation test
 * This bypasses the normal login flow to test if sessions work at all
 */
authDiagnosticRouter.post('/api/auth-test/create-manual-session', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Not available in production' });
  }
  
  const { username } = req.body;
  
  if (!username) {
    return res.status(400).json({ 
      success: false, 
      message: 'Username is required'
    });
  }
  
  try {
    console.log(`🧪 MANUAL SESSION TEST: Creating session for ${username}`);
    
    // Get the user first
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User "${username}" not found`
      });
    }
    
    console.log(`✅ User found: ${user.id} - ${user.username}`);
    
    // Manually create passport session data
    if (!req.session) {
      console.log("❌ No session object available");
      return res.status(500).json({
        success: false,
        message: "No session object available"
      });
    }
    
    // Clear any existing authentication
    if (req.session.passport) {
      delete req.session.passport;
    }
    
    // Manually set passport data
    req.session.passport = {
      user: user.id
    };
    
    console.log(`🔧 Manually set session.passport.user = ${user.id}`);
    
    // Force session save
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error("❌ Error saving manual session:", err);
          reject(err);
        } else {
          console.log("✅ Manual session saved successfully");
          resolve();
        }
      });
    });
    
    // Check if isAuthenticated() works now
    const isAuthenticatedAfter = req.isAuthenticated();
    const hasUserAfter = !!req.user;
    
    console.log(`🔍 After manual session creation:`, {
      isAuthenticated: isAuthenticatedAfter,
      hasUser: hasUserAfter,
      userId: req.user?.id,
      sessionPassport: req.session?.passport,
      sessionKeys: req.session ? Object.keys(req.session) : []
    });
    
    // Verify the session was actually saved to the database
    const sessionStore = storage.sessionStore;
    const verificationResult = await new Promise((resolve) => {
      sessionStore.get(req.sessionID, (err, session) => {
        resolve({
          error: err?.message || null,
          sessionFound: !!session,
          hasPassport: !!(session && session.passport),
          hasUser: !!(session && session.passport && session.passport.user),
          storedUserId: session?.passport?.user || 'No user'
        });
      });
    });
    
    console.log(`🔍 Database verification:`, verificationResult);
    
    return res.json({
      success: isAuthenticatedAfter,
      message: isAuthenticatedAfter 
        ? `Manual session creation successful for ${username}`
        : `Manual session creation failed - passport not working`,
      sessionData: {
        sessionId: req.sessionID,
        isAuthenticated: isAuthenticatedAfter,
        hasUser: hasUserAfter,
        userId: req.user?.id,
        username: req.user?.username,
        manualPassportData: req.session?.passport,
        databaseVerification: verificationResult
      }
    });
    
  } catch (error) {
    console.error('❌ Error in manual session creation:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during manual session creation',
      error: error.message
    });
  }
});

/**
 * Session verification test endpoint
 * This endpoint tries to detect and fix common session issues
 */
authDiagnosticRouter.post('/api/auth-test/verify-fix-session', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Not available in production' });
  }
  
  const { username } = req.body;
  
  if (!username) {
    return res.status(400).json({ 
      success: false, 
      message: 'Username is required'
    });
  }
  
  try {
    // 1. Check existing session state
    const initialState = {
      isAuthenticated: req.isAuthenticated(),
      hasSession: !!req.session,
      sessionID: req.sessionID,
      user: req.user ? {
        id: req.user.id,
        username: req.user.username
      } : null
    };
    
    console.log(`Session verification for ${username} - Initial state:`, initialState);
    
    // 2. Get the user
    const user = await storage.getUserByUsername(username);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User "${username}" not found`,
        initialState
      });
    }
    
    // 3. Check if the current session is for this user
    if (req.isAuthenticated() && req.user && req.user.id === user.id) {
      return res.json({
        success: true,
        message: 'User is already authenticated in this session',
        sessionState: {
          before: initialState,
          current: {
            isAuthenticated: req.isAuthenticated(),
            sessionID: req.sessionID,
            user: {
              id: req.user.id,
              username: req.user.username
            }
          },
          action: 'none_needed'
        }
      });
    }
    
    // 4. If there's an existing user in the session but it's not this user,
    // clear the session first
    if (req.isAuthenticated() && req.user && req.user.id !== user.id) {
      await new Promise<void>((resolve, reject) => {
        req.logout((err) => {
          if (err) {
            console.error('Error logging out current user:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
      
      console.log('Logged out current user to prepare for session verification');
    }
    
    // 5. Attempt to manually login the user
    await new Promise<void>((resolve, reject) => {
      req.login(user, (err) => {
        if (err) {
          console.error('Error manually logging in user:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
    
    // 6. Verify the new session state
    const finalState = {
      isAuthenticated: req.isAuthenticated(),
      hasSession: !!req.session,
      sessionID: req.sessionID,
      user: req.user ? {
        id: req.user.id,
        username: req.user.username
      } : null
    };
    
    console.log(`Session verification for ${username} - Final state:`, finalState);
    
    // Save the session to ensure changes are persisted
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('Error saving session:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
    
    return res.json({
      success: finalState.isAuthenticated,
      message: finalState.isAuthenticated
        ? 'Successfully logged in user and verified session persistence'
        : 'Failed to log in user - session verification failed',
      sessionState: {
        before: initialState,
        current: finalState,
        action: 'manual_login'
      }
    });
  } catch (error) {
    console.error('Error in session verification endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during session verification',
      error: error.message
    });
  }
});
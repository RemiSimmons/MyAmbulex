import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { User as SelectUser, InsertUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// Function to remove sensitive data from user object before sending to client
function sanitizeUser(user: SelectUser) {
  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    emailVerified: user.emailVerified,
    phone: user.phone,
    phoneVerified: user.phoneVerified,
    role: user.role,
    accountStatus: user.accountStatus,
    stripeCustomerId: user.stripeCustomerId,
    isOnboarded: user.isOnboarded,
    profileImageUrl: user.profileImageUrl,
    createdAt: user.createdAt
  };
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  try {
    console.log("User password:", stored ? "Has password" : "No password", 
      stored ? { length: stored.length, hasDelimiter: stored.includes(".") } : {});

    if (!stored || !supplied) {
      console.error("Missing password data for comparison");
      return false;
    }

    // Check if this is a bcrypt hash (starts with $2b$, $2a$, etc.)
    if (stored.startsWith('$2') && stored.length === 60) {
      console.log("Using bcrypt password verification");
      try {
        const result = await bcrypt.compare(supplied, stored);
        console.log(`bcrypt password validation ${result ? 'succeeded' : 'failed'}`);
        return result;
      } catch (bcryptError) {
        console.error("bcrypt comparison error:", bcryptError);
        return false;
      }
    }

    // Legacy password format handling
    let hashed, salt;
    
    // Handle different password storage formats
    if (stored.includes(".")) {
      console.log("Password has delimiter, attempting to split");
      
      if (stored.includes("pbkdf2:sha256:")) {
        // Format: pbkdf2:sha256:iterations$salt$hash
        const parts = stored.split("$");
        if (parts.length >= 3) {
          salt = parts[1];
          hashed = parts[2];
        } else {
          console.error("Invalid pbkdf2 format");
          return false;
        }
      } else {
        // Simple salt.hash format
        [hashed, salt] = stored.split(".");
      }
    } else {
      console.error("Invalid password format: no delimiter found");
      return false;
    }

    console.log("Split password parts:", {
      hashedLength: hashed?.length,
      saltLength: salt?.length,
      hasValidParts: !!(hashed && salt)
    });

    if (!hashed || !salt) {
      console.error("Invalid password format in database, missing hash or salt");
      return false;
    }

    try {
      const hashedBuf = Buffer.from(hashed, "hex");
      
      // Try scrypt for legacy passwords
      let suppliedBuf;
      try {
        suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
        console.log("Using scrypt password verification");
      } catch (scryptError) {
        console.error("scrypt failed:", scryptError);
        return false;
      }

      console.log("Buffers created:", {
        hashedBufLength: hashedBuf.length,
        suppliedBufLength: suppliedBuf.length
      });

      const result = timingSafeEqual(hashedBuf, suppliedBuf);
      console.log(`Password validation ${result ? 'succeeded' : 'failed'}`);

      return result;
    } catch (bufferError) {
      console.error("Buffer operation error:", bufferError);
      return false;
    }
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}

export async function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? undefined : "myambulex-development-key"),
    resave: false,
    saveUninitialized: false, // SECURITY FIX: Prevent session fixation attacks
    store: storage.sessionStore,
    name: 'myambulex.sid',
    rolling: true, // Refresh session on activity
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true, // SECURITY FIX: Prevent XSS access to cookies
      secure: process.env.NODE_ENV === 'production', // SECURITY FIX: HTTPS only in production
      sameSite: 'lax', // Protect against CSRF while allowing normal navigation
      path: '/',
      domain: undefined, // Let the browser determine the domain
      partitioned: false
    }
  };

  console.log("Configuring session with settings:", {
    secret: sessionSettings.secret ? "[SECRET HIDDEN]" : undefined,
    cookie: sessionSettings.cookie,
    store: sessionSettings.store ? "Storage configured" : "No storage",
    storeType: sessionSettings.store ? sessionSettings.store.constructor.name : "No store",
    resave: sessionSettings.resave,
    saveUninitialized: sessionSettings.saveUninitialized
  });

  // Test session store immediately after setup
  if (sessionSettings.store) {
    console.log("🔧 Testing session store connectivity...");
    const testSessionId = 'startup-test-' + Date.now();
    const testData = { test: true, timestamp: new Date().toISOString() };
    
    sessionSettings.store.set(testSessionId, testData, (setErr) => {
      if (setErr) {
        console.error("🚨 Session store WRITE test FAILED:", setErr.message);
      } else {
        console.log("✅ Session store WRITE test passed");
        
        // Test read
        sessionSettings.store.get(testSessionId, (getErr, retrievedData) => {
          if (getErr) {
            console.error("🚨 Session store READ test FAILED:", getErr.message);
          } else if (!retrievedData) {
            console.error("🚨 Session store READ test FAILED: No data returned");
          } else {
            console.log("✅ Session store READ/write functionality verified");
          }
          
          // Cleanup
          sessionSettings.store.destroy(testSessionId, () => {
            console.log("🧹 Test session cleaned up");
          });
        });
      }
    });
  }

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  
  // SECURITY FIX: Dual cookie policy - Use SameSite=None only for OAuth flows
  app.use((req, res, next) => {
    // Check if this is an OAuth route
    const isOAuthRoute = req.path.startsWith('/api/auth/google');
    
    if (isOAuthRoute && req.session && req.session.cookie) {
      // For OAuth, we need SameSite=None to allow cross-site cookies from accounts.google.com
      req.session.cookie.sameSite = 'none';
      // SECURITY FIX: Only set secure=true in production (requires HTTPS)
      // In development, cookies can't be sent with secure=true without HTTPS
      const isProduction = process.env.NODE_ENV === 'production';
      req.session.cookie.secure = isProduction;
      
      console.log('🔐 OAuth route detected - adjusted cookie policy:', {
        path: req.path,
        sameSite: 'none',
        secure: isProduction,
        environment: process.env.NODE_ENV
      });
    }
    // For all other routes, the default Lax policy from sessionSettings applies
    
    next();
  });
  
  // Add session validation middleware
  app.use((req, res, next) => {
    // Ensure session exists and is properly initialized
    if (!req.session) {
      console.error("Session middleware failed to create session object");
      return res.status(500).json({ message: "Session initialization failed" });
    }
    
    // Log session activity for debugging
    if (req.originalUrl.startsWith('/api/') && req.originalUrl !== '/api/user') {
      console.log(`Session middleware check for ${req.method} ${req.originalUrl}:`, {
        hasSession: !!req.session,
        sessionID: req.sessionID,
        hasPassport: !!(req.session && req.session.passport),
        hasUser: !!(req.session && req.session.passport && req.session.passport.user),
        cookiePresent: req.headers.cookie?.includes('myambulex.sid') ? 'yes' : 'no'
      });
    }
    
    next();
  });
  
  app.use(passport.initialize());
  app.use(passport.session());

  // Local Strategy (email/password)
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log("Authentication attempt for username/email:", username);
        console.log("Password length:", password?.length);

        // Get user from database - try username first, then email
        let user;
        try {
          // First try to find by username
          user = await storage.getUserByUsername(username);
          console.log("User query result for username", username + ":", user ? "Found" : "Not found");
          
          // If not found by username, try by email
          if (!user) {
            user = await storage.getUserByEmail(username);
            console.log("User query result for email", username + ":", user ? "Found" : "Not found");
          }
          
          console.log("Final user query result:", user ? "Found user" : "User not found", 
            user ? { id: user.id, username: user.username, email: user.email } : {});
        } catch (dbErr) {
          console.error("Database error fetching user:", dbErr);
          return done(dbErr);
        }

        if (!user) {
          console.log("User not found:", username);
          return done(null, false, { message: "User not found" });
        }

        console.log("User password:", user.password ? "Has password" : "No password", 
          user.password ? { length: user.password.length, hasDelimiter: user.password.includes(".") } : {});

        // Validate password
        let passwordValid;
        try {
          passwordValid = await comparePasswords(password, user.password);
          console.log("Password validation result:", passwordValid);
        } catch (pwErr) {
          console.error("Password validation error:", pwErr);
          return done(pwErr);
        }

        if (!passwordValid) {
          console.log("Password invalid for user:", username);
          return done(null, false, { message: "Invalid password" });
        }

        console.log("Authentication successful for:", username);
        return done(null, user);
      } catch (err) {
        console.error("Authentication error:", err);
        return done(err);
      }
    }),
  );

  // Google OAuth Strategy (only if credentials are provided)
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/api/auth/google/callback",
          state: true, // Enable CSRF protection
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            console.log("Google OAuth authentication for:", profile.emails?.[0]?.value);
            
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error("No email provided by Google"));
            }

            // Check if user already exists
            let user = await storage.getUserByEmail(email);
            
            if (user) {
              console.log("Existing user found via Google OAuth:", email);
              return done(null, user);
            }

            // Create new user from Google profile
            console.log("Creating new user from Google OAuth:", email);
            
            // Get role from request if available (passed through session)
            // Note: req is not directly accessible here, role will be 'rider' by default
            // The backend will need to update this if user selects a different role
            
            const newUser = await storage.createUser({
              username: email.split('@')[0] + '_' + Date.now(), // Generate unique username
              password: await hashPassword(randomBytes(32).toString('hex')), // Random password
              fullName: profile.displayName || email.split('@')[0],
              email: email,
              emailVerified: true, // Google verified the email
              phone: '', // Will need to be added during onboarding
              role: 'rider', // Default role, will be set properly in callback
              accountStatus: 'active',
              profileImageUrl: profile.photos?.[0]?.value || null,
            });

            console.log("New user created via Google OAuth:", newUser.id);
            return done(null, newUser);
          } catch (err) {
            console.error("Google OAuth authentication error:", err);
            return done(err);
          }
        }
      )
    );
    console.log("✅ Google OAuth strategy configured");
  } else {
    console.log("⚠️  Google OAuth not configured (missing credentials)");
  }

  passport.serializeUser((user, done) => {
    console.log("🔵 SERIALIZE: Starting user serialization:", { 
      id: user.id, 
      username: user.username,
      timestamp: new Date().toISOString()
    });
    console.log("🔵 SERIALIZE: Full user object:", JSON.stringify(user, null, 2));
    
    try {
      done(null, user.id);
      console.log("🔵 SERIALIZE: ✅ SUCCESS - User serialized with ID:", user.id);
    } catch (serializeError) {
      console.error("🔵 SERIALIZE: ❌ ERROR:", serializeError);
      done(serializeError);
    }
  });

  // Enhanced session cache with longer TTL and rate limiting
  const userCache = new Map<number, {user: User, timestamp: number}>();
  const CACHE_TTL = 15 * 60 * 1000; // 15 minutes (increased)
  const DESERIALIZATION_THROTTLE = new Map<number, number>();
  const THROTTLE_WINDOW = 1000; // 1 second throttle window

  passport.deserializeUser(async (id: number, done) => {
    console.log("🟡 DESERIALIZE: Starting deserialization for user ID:", id, "at", new Date().toISOString());
    
    try {
      const now = Date.now();

      // Throttle repeated deserializations for the same user
      const lastDeserialization = DESERIALIZATION_THROTTLE.get(id);
      if (lastDeserialization && (now - lastDeserialization) < THROTTLE_WINDOW) {
        console.log("🟡 DESERIALIZE: Throttle check - last deserialization was", now - lastDeserialization, "ms ago");
        // Use cached version if available, don't log excessive attempts
        const cached = userCache.get(id);
        if (cached && (now - cached.timestamp) < CACHE_TTL) {
          console.log("🟡 DESERIALIZE: ✅ Using cached user (throttled):", { id: cached.user.id, username: cached.user.username });
          return done(null, cached.user);
        }
      }

      DESERIALIZATION_THROTTLE.set(id, now);

      // Check cache first
      const cached = userCache.get(id);
      if (cached && (now - cached.timestamp) < CACHE_TTL) {
        console.log("🟡 DESERIALIZE: ✅ Using cached user:", { 
          id: cached.user.id, 
          username: cached.user.username,
          cacheAge: now - cached.timestamp,
          maxAge: CACHE_TTL
        });
        return done(null, cached.user);
      }

      // Fetch from database only if not cached or expired
      console.log("🟡 DESERIALIZE: Cache miss - fetching user from database:", id);
      const user = await storage.getUser(id);
      
      if (!user) {
        console.error("🟡 DESERIALIZE: ❌ User not found in database:", id);
        return done(null, false);
      }

      console.log("🟡 DESERIALIZE: ✅ User found in database:", { 
        id: user.id, 
        username: user.username,
        role: user.role
      });

      // Update cache
      userCache.set(id, {user, timestamp: now});
      console.log("🟡 DESERIALIZE: User cached successfully");

      // Clean up old throttle entries
      if (DESERIALIZATION_THROTTLE.size > 1000) {
        const cutoff = now - THROTTLE_WINDOW;
        for (const [userId, timestamp] of DESERIALIZATION_THROTTLE.entries()) {
          if (timestamp < cutoff) {
            DESERIALIZATION_THROTTLE.delete(userId);
          }
        }
      }

      console.log("🟡 DESERIALIZE: ✅ SUCCESS - Calling done() with user");
      done(null, user);
    } catch (err) {
      console.error("🟡 DESERIALIZE: ❌ CRITICAL ERROR:", err);
      done(err);
    }
  });

  // Register user endpoint with better error handling
  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("Registration attempt:", { 
        username: req.body.username,
        fullName: req.body.fullName,
        role: req.body.role 
      });

      // Validate request body
      if (!req.body.username || !req.body.password || !req.body.fullName || 
          !req.body.email || !req.body.phone || !req.body.role) {
        console.log("Registration failed: Missing required fields");
        return res.status(400).json({ message: "All fields are required" });
      }

      // Validate role
      if (!["rider", "driver", "admin"].includes(req.body.role)) {
        console.log("Registration failed: Invalid role", req.body.role);
        return res.status(400).json({ message: "Invalid role" });
      }

      // Check for existing active user (allow reusing usernames from deleted/rejected users)
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser && existingUser.accountStatus !== 'rejected') {
        console.log("Registration failed: Username already exists", req.body.username);
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check for existing email (email should be unique across all users)
      const existingEmailUser = await storage.getUserByEmail(req.body.email);
      if (existingEmailUser && existingEmailUser.accountStatus !== 'rejected') {
        console.log("Registration failed: Email already exists", req.body.email);
        return res.status(400).json({ message: "Email already exists" });
      }

      // Validate beta invite code if provided
      if (req.body.betaInviteCode) {
        console.log("Beta registration attempt with code:", req.body.betaInviteCode);
        // For now, just log the beta code - full validation can be added later if needed
        // The beta invitation system already tracks sent invitations
      }

      let user;
      
      if (existingUser && existingUser.accountStatus === 'rejected') {
        // Reactivate the rejected user with new data
        console.log("Reactivating rejected user:", req.body.username);
        user = await storage.updateUser(existingUser.id, {
          ...req.body,
          password: await hashPassword(req.body.password),
          emailVerified: false,
          phoneVerified: false,
          accountStatus: "active",
          notificationPreferences: {
            email: true,
            sms: true,
            push: true
          },
          preferredLanguage: "English",
          timezone: "UTC",
          isOnboarded: false
        });
      } else {
        // Create new user with default notification preferences and account status
        user = await storage.createUser({
          ...req.body,
          password: await hashPassword(req.body.password),
          emailVerified: false,
          phoneVerified: false,
          accountStatus: "active",
          notificationPreferences: {
            email: true,
            sms: true,
            push: true
          },
          preferredLanguage: "English",
          timezone: "UTC",
          isOnboarded: false
        });
      }

      console.log("User created successfully:", { id: user.id, username: user.username });

      // Log the user in
      req.login(user, (err) => {
        if (err) {
          console.error("Login after registration failed:", err);
          return next(err);
        }

        console.log("User login successful, session state:", {
          sessionID: req.sessionID,
          isAuthenticated: req.isAuthenticated(),
          hasUser: !!req.user,
          userId: req.user?.id,
          sessionKeys: req.session ? Object.keys(req.session) : 'No session'
        });

        // Force session save and ensure cookie is set
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Error saving session after registration:", saveErr);
            return next(saveErr);
          }

          console.log("Session saved successfully after registration:", {
            sessionID: req.sessionID,
            isAuthenticated: req.isAuthenticated(),
            hasUser: !!req.user,
            userId: req.user?.id,
            sessionData: req.session ? JSON.stringify(req.session, null, 2) : 'No session'
          });

          // Manually set the cookie header to ensure it's sent
          res.cookie('myambulex.sid', req.sessionID, {
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            httpOnly: true, // SECURITY FIX: Prevent XSS access
            secure: process.env.NODE_ENV === 'production', // SECURITY FIX: HTTPS in production
            sameSite: 'lax',
            path: '/',
            domain: undefined
          });

          res.status(201).json(sanitizeUser(user));
        });
      });

    } catch (err) {
      console.error("Registration error:", err);
      res.status(500).json({ message: "Server error during registration" });
    }
  });

  // Login endpoint with enhanced debugging and session regeneration
  app.post("/api/login", (req, res, next) => {
    console.log("POST /api/login - Login attempt:", {
      username: req.body.username,
      hasPassword: !!req.body.password,
      sessionBefore: {
        hasSession: !!req.session,
        sessionID: req.sessionID,
        isAuthenticated: req.isAuthenticated()
      },
      bodyKeys: Object.keys(req.body || {}),
      bodyValid: typeof req.body === 'object' && req.body !== null,
      forceSessionRegeneration: req.headers['x-force-session-regeneration'] === 'true'
    });

    // Validate request data
    if (!req.body || typeof req.body !== 'object') {
      console.error("Login error: Invalid request body format");
      return res.status(400).json({ message: "Invalid request format" });
    }

    if (!req.body.username || !req.body.password) {
      console.error("Login error: Missing username or password");
      return res.status(400).json({ message: "Username and password are required" });
    }

    // Handle session regeneration if requested
    const shouldRegenerateSession = req.headers['x-force-session-regeneration'] === 'true';

    if (shouldRegenerateSession) {
      console.log("Force session regeneration requested");

      // Regenerate session before authentication
      req.session.regenerate((regenerateErr) => {
        if (regenerateErr) {
          console.error("Session regeneration error:", regenerateErr);
          return next(regenerateErr);
        }

        console.log("Session regenerated successfully, new session ID:", req.sessionID);

        // Now proceed with authentication using the new session
        proceedWithAuthentication();
      });
    } else {
      // Proceed with normal authentication
      proceedWithAuthentication();
    }

    function proceedWithAuthentication() {
      passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
        if (err) {
          console.error("Login error:", err);
          return next(err);
        }

        if (!user) {
          console.log("Login failed for username:", req.body.username, "Info:", info);
          return res.status(401).json({ message: "Invalid username or password" });
        }

        req.login(user, (loginErr) => {
            if (loginErr) {
              console.error("🔴 LOGIN: req.login() failed:", loginErr);
              return next(loginErr);
            }

            console.log("🟢 LOGIN: req.login() completed successfully");
            console.log("🟢 LOGIN: Session state after req.login():", {
              sessionId: req.sessionID,
              isAuthenticated: req.isAuthenticated(),
              userId: req.user?.id,
              userUsername: req.user?.username,
              sessionPassport: req.session?.passport,
              sessionKeys: req.session ? Object.keys(req.session) : 'No session',
              passportKeys: req.session?.passport ? Object.keys(req.session.passport) : 'No passport'
            });
            
            console.log("🟢 LOGIN: Full session data:", req.session ? JSON.stringify(req.session, null, 2) : 'No session');

            // Save the session immediately without regeneration to maintain consistency
            console.log("🟢 LOGIN: Starting session.save()...");
            req.session.save((saveErr) => {
                if (saveErr) {
                  console.error("🔴 LOGIN: ❌ CRITICAL - Session save failed:", saveErr);
                  return next(saveErr);
                }

                console.log("🟢 LOGIN: ✅ Session saved successfully");
                console.log("🟢 LOGIN: Post-save verification:", {
                  sessionID: req.sessionID,
                  isAuthenticated: req.isAuthenticated(),
                  hasPassport: !!(req.session && req.session.passport),
                  hasUser: !!(req.session && req.session.passport && req.session.passport.user),
                  passportUser: req.session?.passport?.user,
                  sessionCookiePresent: !!req.headers.cookie?.includes('myambulex.sid')
                });
                
                console.log("🟢 LOGIN: Full session after save:", req.session ? JSON.stringify(req.session, null, 2) : 'No session');

                // Double-check by reading from session store
                console.log("🟢 LOGIN: Verifying session in store...");
                const sessionStore = storage.sessionStore;
                sessionStore.get(req.sessionID, (getErr, storedSession) => {
                  if (getErr) {
                    console.error("🔴 LOGIN: ❌ Error reading from session store:", getErr);
                  } else {
                    console.log("🟢 LOGIN: Session store verification:", {
                      sessionFound: !!storedSession,
                      hasPassport: !!(storedSession && storedSession.passport),
                      hasUser: !!(storedSession && storedSession.passport && storedSession.passport.user),
                      storedUserId: storedSession && storedSession.passport ? storedSession.passport.user : 'No user ID',
                      sessionKeys: storedSession ? Object.keys(storedSession) : [],
                      passportKeys: storedSession && storedSession.passport ? Object.keys(storedSession.passport) : []
                    });

                    if (!storedSession || !storedSession.passport || !storedSession.passport.user) {
                      console.error("🔴 LOGIN: ❌ CRITICAL: Passport data NOT saved to session store!");
                      console.log("🔴 LOGIN: Stored session data:", storedSession ? JSON.stringify(storedSession, null, 2) : 'null');
                    } else {
                      console.log("🟢 LOGIN: ✅ SUCCESS: Passport data properly saved to session store");
                    }
                  }
                });

                // Set the session cookie explicitly
                res.cookie('myambulex.sid', req.sessionID, {
                  maxAge: 24 * 60 * 60 * 1000, // 24 hours
                  httpOnly: false, // Allow JavaScript access
                  secure: false, // Keep false for Replit
                  sameSite: 'none',
                  path: '/',
                  domain: undefined
                });

                // Return sanitized user data
                const sanitizedUser = {
                  id: user.id,
                  username: user.username,
                  fullName: user.fullName,
                  email: user.email,
                  emailVerified: user.emailVerified,
                  phone: user.phone,
                  phoneVerified: user.phoneVerified,
                  role: user.role,
                  accountStatus: user.accountStatus,
                  stripeCustomerId: user.stripeCustomerId,
                  isOnboarded: user.isOnboarded,
                  profileImageUrl: user.profileImageUrl,
                  createdAt: user.createdAt
                };

                console.log("Login complete, returning user data for:", user.username);
                return res.status(200).json(sanitizedUser);
              });
          });
      })(req, res, next);
    }
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Payment intent endpoint - moved here to avoid Vite middleware interference
  app.post("/api/create-payment-intent", async (req, res, next) => {
    try {
      // Check authentication
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      console.log("🔵 Payment intent creation request:", {
        userId: req.user.id,
        userRole: req.user.role,
        body: req.body,
        timestamp: new Date().toISOString()
      });

      const { rideId, promoCode } = req.body;

      // Validate input
      if (!rideId) {
        return res.status(400).json({ error: "Ride ID is required" });
      }

      // Initialize Stripe dynamically
      let stripe;
      try {
        const Stripe = (await import("stripe")).default;
        stripe = new Stripe(process.env.Stripe_Secret_Key || process.env.STRIPE_SECRET_KEY || "", {
          apiVersion: "2024-06-20",
        });
      } catch (stripeError) {
        console.error("Stripe initialization error:", stripeError);
        return res.status(500).json({ error: "Payment service unavailable" });
      }

      // Get ride details
      const { storage } = await import("./storage");
      const ride = await storage.getRide(rideId);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }

      console.log("🔵 Retrieved ride:", {
        id: ride.id,
        finalPrice: ride.finalPrice,
        riderId: ride.riderId,
        currentUser: req.user.id
      });

      // Verify user can access this ride
      if (ride.riderId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied" });
      }

      // Verify ride has a valid final price
      if (!ride.finalPrice || ride.finalPrice <= 0) {
        return res.status(400).json({ error: "Invalid ride pricing" });
      }

      // Calculate payment amount with promo code if provided
      let amount = ride.finalPrice;
      let discountAmount = 0;
      let promoCodeApplied = false;
      let promoCodeDescription = '';

      if (promoCode) {
        try {
          const { promoCodeService } = await import("./promo-code-service");
          const promoResult = await promoCodeService.applyPromoCodeToRide(
            promoCode,
            req.user.id,
            rideId,
            ride.finalPrice
          );

          if (promoResult.success) {
            amount = promoResult.finalAmount;
            discountAmount = promoResult.discountAmount;
            promoCodeApplied = true;
            promoCodeDescription = promoResult.description || '';
            
            console.log("🔵 Promo code applied:", {
              code: promoCode,
              originalAmount: ride.finalPrice,
              discountAmount,
              finalAmount: amount
            });
          } else {
            console.log("🔵 Promo code validation failed:", promoResult.description);
            return res.status(400).json({ error: promoResult.description });
          }
        } catch (promoError) {
          console.error("🔴 Promo code processing error:", promoError);
          return res.status(500).json({ error: "Failed to process promo code" });
        }
      }

      // Convert to cents if not already
      const amountInCents = Math.round(amount * 100);

      console.log("🔵 Creating payment intent:", {
        amount: amountInCents,
        currency: "usd",
        rideId: rideId,
        promoCodeApplied,
        promoCode: promoCode || 'none',
        discountAmount
      });

      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "usd",
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          rideId: rideId.toString(),
          userId: req.user.id.toString(),
          promoCode: promoCode || '',
          promoCodeApplied: promoCodeApplied.toString(),
          discountAmount: discountAmount.toString(),
          originalAmount: ride.finalPrice.toString()
        }
      });

      console.log("🔵 Payment intent created successfully:", {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        status: paymentIntent.status
      });

      // Return client secret for frontend
      res.json({
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        rideId: rideId
      });

    } catch (error) {
      console.error("🔴 Payment intent creation error:", error);
      
      // Handle Stripe errors
      if (error && typeof error === 'object' && 'type' in error) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: "Failed to create payment intent" });
    }
  });

  // Authentication middleware for Stripe Connect routes
  const authenticateUser = async (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Stripe Connect endpoints for driver onboarding
  app.post("/api/stripe-connect/create-account", authenticateUser, async (req, res) => {
    try {
      if (req.user.role !== 'driver') {
        return res.status(403).json({ message: "Only drivers can create connected accounts" });
      }

      const { stripeConnectService } = await import("./stripe-connect-service");
      const { storage: storageService } = await import("./storage");
      
      // Check if driver already has a connected account
      const driver = await storageService.getDriverDetails(req.user.id);
      if (driver?.stripeConnectedAccountId) {
        return res.status(400).json({ message: "Connected account already exists" });
      }

      // Create connected account
      const account = await stripeConnectService.createConnectedAccount(
        req.user.id,
        req.user.email || '',
        'individual'
      );

      res.json({
        accountId: account.id,
        success: true
      });

    } catch (error) {
      console.error('Error creating connected account:', error);
      res.status(500).json({ error: "Failed to create connected account" });
    }
  });

  app.post("/api/stripe-connect/onboarding-link", authenticateUser, async (req, res) => {
    try {
      if (req.user.role !== 'driver') {
        return res.status(403).json({ message: "Only drivers can access onboarding" });
      }

      const { stripeConnectService } = await import("./stripe-connect-service");
      const { storage: storageService } = await import("./storage");
      
      // Get driver's connected account ID
      const driver = await storageService.getDriverDetails(req.user.id);
      if (!driver?.stripeConnectedAccountId) {
        return res.status(404).json({ message: "No connected account found" });
      }

      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
      const returnUrl = `${baseUrl}/driver/stripe-onboarding/success`;
      const refreshUrl = `${baseUrl}/driver/stripe-onboarding/refresh`;

      const onboardingUrl = await stripeConnectService.createOnboardingLink(
        driver.stripeConnectedAccountId,
        returnUrl,
        refreshUrl
      );

      res.json({
        onboardingUrl: onboardingUrl,
        success: true
      });

    } catch (error) {
      console.error('Error creating onboarding link:', error);
      res.status(500).json({ error: "Failed to create onboarding link" });
    }
  });

  app.get("/api/stripe-connect/account-status", authenticateUser, async (req, res) => {
    try {
      if (req.user.role !== 'driver') {
        return res.status(403).json({ message: "Only drivers can check account status" });
      }

      const { stripeConnectService } = await import("./stripe-connect-service");
      const { storage: storageService } = await import("./storage");
      
      // Get driver's connected account ID
      const driver = await storageService.getDriverDetails(req.user.id);
      if (!driver?.stripeConnectedAccountId) {
        return res.json({
          hasAccount: false,
          isOnboarded: false,
          canReceivePayments: false,
          requirements: []
        });
      }

      const status = await stripeConnectService.getAccountStatus(driver.stripeConnectedAccountId);
      
      res.json({
        hasAccount: true,
        accountId: driver.stripeConnectedAccountId,
        ...status
      });

    } catch (error) {
      console.error('Error checking account status:', error);
      res.status(500).json({ error: "Failed to check account status" });
    }
  });

  app.post("/api/stripe-connect/dashboard-link", authenticateUser, async (req, res) => {
    try {
      if (req.user.role !== 'driver') {
        return res.status(403).json({ message: "Only drivers can access dashboard" });
      }

      const { stripeConnectService } = await import("./stripe-connect-service");
      const { storage: storageService } = await import("./storage");
      
      // Get driver's connected account ID
      const driver = await storageService.getDriverDetails(req.user.id);
      if (!driver?.stripeConnectedAccountId) {
        return res.status(404).json({ message: "No connected account found" });
      }

      const dashboardUrl = await stripeConnectService.createExpressDashboardLink(
        driver.stripeConnectedAccountId
      );

      res.json({
        dashboardUrl: dashboardUrl,
        success: true
      });

    } catch (error) {
      console.error('Error creating dashboard link:', error);
      res.status(500).json({ error: "Failed to create dashboard link" });
    }
  });

  // Admin Promo Code Management Routes
  app.get("/api/admin/promo-codes", authenticateUser, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { storage: storageService } = await import("./storage");
      const promoCodes = await storageService.getAllPromoCodes();
      res.json(promoCodes);
    } catch (error) {
      console.error('Error fetching promo codes:', error);
      res.status(500).json({ error: "Failed to fetch promo codes" });
    }
  });

  app.post("/api/admin/promo-codes", authenticateUser, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { storage: storageService } = await import("./storage");
      const {
        code,
        description,
        discountType,
        discountValue,
        maxUses,
        expiresAt,
        isActive,
        applicableRoles,
        minimumAmount
      } = req.body;

      // Validate required fields
      if (!code || !description || !discountType || discountValue === undefined) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Check if code already exists
      const existingCode = await storageService.getPromoCodeByCode(code.toUpperCase());
      if (existingCode) {
        return res.status(400).json({ error: "Promo code already exists" });
      }

      const promoCodeData = {
        code: code.toUpperCase(),
        description,
        discountType,
        discountValue,
        maxUses: maxUses || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: isActive !== undefined ? isActive : true,
        applicableRoles: JSON.stringify(applicableRoles || ['rider', 'driver']),
        minimumAmount: minimumAmount || 0,
        createdBy: req.user.id
      };

      const newPromoCode = await storageService.createPromoCode(promoCodeData);
      res.status(201).json(newPromoCode);
    } catch (error) {
      console.error('Error creating promo code:', error);
      res.status(500).json({ error: "Failed to create promo code" });
    }
  });

  app.put("/api/admin/promo-codes/:id", authenticateUser, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { storage: storageService } = await import("./storage");
      const promoCodeId = parseInt(req.params.id);
      const updates = req.body;

      // Convert arrays to JSON strings if needed
      if (updates.applicableRoles && Array.isArray(updates.applicableRoles)) {
        updates.applicableRoles = JSON.stringify(updates.applicableRoles);
      }

      // Handle date conversion
      if (updates.expiresAt) {
        updates.expiresAt = new Date(updates.expiresAt);
      }

      const updatedPromoCode = await storageService.updatePromoCode(promoCodeId, updates);
      
      if (!updatedPromoCode) {
        return res.status(404).json({ error: "Promo code not found" });
      }

      res.json(updatedPromoCode);
    } catch (error) {
      console.error('Error updating promo code:', error);
      res.status(500).json({ error: "Failed to update promo code" });
    }
  });

  app.delete("/api/admin/promo-codes/:id", authenticateUser, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { storage: storageService } = await import("./storage");
      const promoCodeId = parseInt(req.params.id);

      const success = await storageService.deletePromoCode(promoCodeId);
      
      if (!success) {
        return res.status(404).json({ error: "Promo code not found" });
      }

      res.json({ message: "Promo code deleted successfully" });
    } catch (error) {
      console.error('Error deleting promo code:', error);
      res.status(500).json({ error: "Failed to delete promo code" });
    }
  });

  // Get current user endpoint with session repair functionality
  app.get("/api/user", async (req, res) => {
    console.log("🔍 /api/user - COMPREHENSIVE SESSION DIAGNOSTIC:", {
      timestamp: new Date().toISOString(),
      requestInfo: {
        sessionID: req.sessionID?.substring(0, 12) + '...',
        isAuthenticated: req.isAuthenticated(),
        hasUser: !!req.user,
        userId: req.user?.id || 'No user',
        hasSession: !!req.session,
        hasSessionID: !!req.sessionID
      },
      sessionContent: {
        sessionKeys: req.session ? Object.keys(req.session) : 'No session',
        hasPassport: !!(req.session && req.session.passport),
        passportKeys: req.session?.passport ? Object.keys(req.session.passport) : 'No passport',
        passportUser: req.session?.passport?.user || 'No user in passport'
      },
      cookieInfo: {
        hasCookieHeader: !!req.headers.cookie,
        cookieCount: req.headers.cookie ? req.headers.cookie.split(';').length : 0,
        hasMyambulexCookie: req.headers.cookie?.includes('myambulex.sid') || false,
        cookieValue: req.headers.cookie?.split(';').find(c => c.includes('myambulex.sid'))?.substring(0, 30) + '...' || 'Not found'
      }
    });

    // DIAGNOSTIC: Test session store directly
    if (req.sessionID && storage.sessionStore) {
      console.log("🔍 TESTING session store directly...");
      
      try {
        const directSessionLookup = await new Promise((resolve) => {
          const startTime = Date.now();
          storage.sessionStore.get(req.sessionID, (err, session) => {
            const duration = Date.now() - startTime;
            console.log("🔍 Direct session store lookup result:", {
              sessionID: req.sessionID?.substring(0, 12) + '...',
              duration: duration + 'ms',
              error: err?.message || null,
              sessionFound: !!session,
              sessionType: session ? typeof session : 'null',
              sessionKeys: session ? Object.keys(session) : 'No session',
              hasPassport: session?.passport ? true : false,
              hasUser: session?.passport?.user ? true : false,
              userId: session?.passport?.user || 'No user'
            });
            resolve({ session, error: err });
          });
        });

        // If we found session data but req.user is missing, there's a deserialization issue
        if ((directSessionLookup as any).session?.passport?.user && !req.user) {
          console.log("🚨 DESERIALIZATION FAILURE DETECTED:", {
            issue: "Session exists in store but user not deserialized",
            sessionUserId: (directSessionLookup as any).session.passport.user,
            reqUserId: req.user?.id || 'No req.user',
            possibleCause: "passport.deserializeUser() failure or session middleware order issue"
          });
        }

      } catch (sessionTestError) {
        console.error("🔍 Session store test error:", sessionTestError.message);
      }
    }

    // First check if user is authenticated normally
    if (req.isAuthenticated() && req.user) {
      console.log("✅ User properly authenticated, returning data");
      
      // User is properly authenticated, return data
      const sanitizedUser = sanitizeUser(req.user);
      
      // Ensure session cookie is set
      res.cookie('myambulex.sid', req.sessionID, {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true, // SECURITY FIX: Prevent XSS access
        secure: process.env.NODE_ENV === 'production', // SECURITY FIX: HTTPS in production
        sameSite: 'lax',
        path: '/'
      });
      
      return res.json(sanitizedUser);
    }

    // If not authenticated, try to repair session
    if (req.sessionID && storage.sessionStore) {
      try {
        const storedSession = await new Promise((resolve) => {
          storage.sessionStore.get(req.sessionID, (err, session) => {
            resolve(err ? null : session);
          });
        });

        if (storedSession && storedSession.passport && storedSession.passport.user) {
          // Session exists in store but not loaded properly, try to get user
          const user = await storage.getUser(storedSession.passport.user);
          if (user) {
            // Manually authenticate the user for this request
            req.login(user, (loginErr) => {
              if (loginErr) {
                console.error("Manual login failed:", loginErr);
                return res.sendStatus(401);
              }
              
              const sanitizedUser = sanitizeUser(user);
              res.cookie('myambulex.sid', req.sessionID, {
                maxAge: 24 * 60 * 60 * 1000,
                httpOnly: true, // SECURITY FIX: Prevent XSS access
                secure: process.env.NODE_ENV === 'production', // SECURITY FIX: HTTPS in production
                sameSite: 'lax',
                path: '/'
              });
              
              return res.json(sanitizedUser);
            });
            return;
          }
        }
      } catch (error) {
        console.error("Session repair failed:", error);
      }
    }

    // If all else fails, user is not authenticated
    return res.sendStatus(401);
  });

  // Forgot password endpoint
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Don't reveal if email exists for security
        return res.status(200).json({ 
          message: "If an account with that email exists, you will receive a password reset link." 
        });
      }

      // Generate a secure password reset token
      const crypto = await import('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpiry = new Date(Date.now() + 3600000); // 1 hour

      // Store reset token in user record
      await storage.updateUser(user.id, {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpiry
      });

      // Send password reset email
      try {
        const { sendEmail } = await import('./email-service');
        const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] || 'https://myambulex.com';
        const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
        
        const emailSent = await sendEmail({
          to: email,
          from: 'MyAmbulex Support <support@myambulex.com>',
          subject: 'Reset Your MyAmbulex Password',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #00BCD4 0%, #0097A7 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">MyAmbulex</h1>
                <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Medical Transportation Platform</p>
              </div>
              
              <div style="background: white; padding: 40px; border: 1px solid #e5e5e5;">
                <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
                <p style="color: #666; line-height: 1.6;">Hi ${user.fullName || user.username},</p>
                <p style="color: #666; line-height: 1.6;">
                  We received a request to reset your password for your MyAmbulex account. 
                  Click the button below to reset your password:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" 
                     style="background: #00BCD4; color: white; padding: 15px 30px; text-decoration: none; 
                            border-radius: 5px; font-weight: bold; display: inline-block;">
                    Reset Password
                  </a>
                </div>
                
                <p style="color: #666; line-height: 1.6;">
                  Or copy and paste this link into your browser:
                </p>
                <p style="color: #00BCD4; word-break: break-all; padding: 10px; background: #f5f5f5; border-radius: 5px;">
                  ${resetUrl}
                </p>
                
                <p style="color: #666; line-height: 1.6; margin-top: 30px;">
                  This link will expire in 1 hour for security reasons.
                </p>
                
                <p style="color: #666; line-height: 1.6;">
                  If you didn't request this password reset, please ignore this email. 
                  Your password will remain unchanged.
                </p>
              </div>
              
              <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e5e5e5;">
                <p style="color: #666; margin: 0; font-size: 14px;">
                  © 2025 MyAmbulex. All rights reserved.
                </p>
              </div>
            </div>
          `,
          text: `
Hi ${user.fullName || user.username},

We received a request to reset your password for your MyAmbulex account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email. Your password will remain unchanged.

© 2025 MyAmbulex. All rights reserved.
          `
        });

        if (emailSent) {
          console.log(`✅ Password reset email sent successfully to: ${email}`);
        } else {
          console.log(`⚠️ Failed to send password reset email to: ${email}`);
        }
      } catch (emailError) {
        console.error("Password reset email error:", emailError);
        // Don't fail the request if email sending fails
      }

      // Always log the reset link for development/testing
      console.log(`🔗 Password reset link for ${email}: /reset-password?token=${resetToken}`);

      res.status(200).json({ 
        message: "If an account with that email exists, you will receive a password reset link.",
        // Include link in development for testing (remove in production)
        ...(process.env.NODE_ENV === 'development' && { 
          resetLink: `/reset-password?token=${resetToken}` 
        })
      });
      
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Reset password endpoint
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      // Find user by reset token
      const user = await storage.getUserByResetToken(token);
      
      if (!user || !user.passwordResetExpires || new Date() > user.passwordResetExpires) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update user password and clear reset token
      await storage.updateUser(user.id, {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null
      });

      console.log(`✅ Password successfully reset for user: ${user.username} (${user.email})`);
      res.status(200).json({ message: "Password reset successfully" });
      
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });


}
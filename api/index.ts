// Vercel Serverless Function - Express API Handler
// This wraps the main server routes for Vercel deployment

import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import bcrypt from "bcrypt";
import connectPg from "connect-pg-simple";
import { Pool } from "pg";

// Initialize database pool for session store
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') || process.env.DATABASE_URL?.includes('neon') 
    ? { rejectUnauthorized: false } 
    : undefined,
});

const app = express();

// Trust proxy for Vercel (important for secure cookies)
app.set('trust proxy', 1);

// CORS for API routes
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    process.env.BASE_URL,
    'https://myambulex.com',
    'https://www.myambulex.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ].filter(Boolean);

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// PostgreSQL Session Store for serverless
const PostgresSessionStore = connectPg(session);
const sessionStore = new PostgresSessionStore({
  pool: pool,
  tableName: 'session',
  createTableIfMissing: true,
});

const sessionSettings: session.SessionOptions = {
  secret: process.env.SESSION_SECRET || 'fallback-dev-secret',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  name: 'myambulex.sid',
  rolling: true,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  },
};

app.use(session(sessionSettings));
app.use(passport.initialize());
app.use(passport.session());

// Helper functions
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  if (!stored) return false;
  // Handle bcrypt format
  if (stored.startsWith("$2")) {
    return bcrypt.compare(supplied, stored);
  }
  // Handle scrypt format
  const [hashed, salt] = stored.split(".");
  if (!salt) return false;
  const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(Buffer.from(hashed, "hex"), buf);
}

// Simple user queries using the pool directly
async function getUserByEmail(email: string) {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
}

async function getUserByUsername(username: string) {
  const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  return result.rows[0] || null;
}

async function getUserById(id: number) {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function createUser(userData: any) {
  const result = await pool.query(
    `INSERT INTO users (username, password, full_name, email, email_verified, phone, role, account_status, profile_image_url, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     RETURNING *`,
    [
      userData.username,
      userData.password,
      userData.fullName,
      userData.email,
      userData.emailVerified || false,
      userData.phone || '',
      userData.role || 'rider',
      userData.accountStatus || 'active',
      userData.profileImageUrl || null
    ]
  );
  return result.rows[0];
}

async function updateUser(id: number, updates: any) {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.role !== undefined) {
    setClauses.push(`role = $${paramIndex++}`);
    values.push(updates.role);
  }
  
  if (setClauses.length === 0) return getUserById(id);
  
  values.push(id);
  const result = await pool.query(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0];
}

function sanitizeUser(user: any) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name || user.fullName,
    email: user.email,
    emailVerified: user.email_verified || user.emailVerified,
    phone: user.phone,
    phoneVerified: user.phone_verified || user.phoneVerified,
    role: user.role,
    accountStatus: user.account_status || user.accountStatus,
    stripeCustomerId: user.stripe_customer_id || user.stripeCustomerId,
    isOnboarded: user.is_onboarded || user.isOnboarded,
    profileImageUrl: user.profile_image_url || user.profileImageUrl,
    createdAt: user.created_at || user.createdAt
  };
}

// Passport serialization
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await getUserById(id);
    done(null, user || null);
  } catch (err) {
    done(err);
  }
});

// Local Strategy
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      let user = await getUserByUsername(username);
      if (!user) {
        user = await getUserByEmail(username);
      }
      
      if (!user) {
        return done(null, false, { message: "User not found" });
      }
      if (!user.password) {
        return done(null, false, { message: "No password set - please use Google login" });
      }
      
      const valid = await comparePasswords(password, user.password);
      if (!valid) {
        return done(null, false, { message: "Invalid password" });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const callbackURL = process.env.BASE_URL 
    ? `${process.env.BASE_URL.replace(/\/$/, '')}/api/auth/google/callback`
    : "/api/auth/google/callback";

  console.log('🔐 Vercel API: Google OAuth configured with callback URL:', callbackURL);

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: callbackURL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error("No email provided by Google"));
          }

          let user = await getUserByEmail(email);
          
          if (user) {
            console.log('✅ Existing user found via Google OAuth:', email);
            return done(null, user);
          }

          console.log('📝 Creating new user from Google OAuth:', email);
          const newUser = await createUser({
            username: email.split('@')[0] + '_' + Date.now(),
            password: await hashPassword(randomBytes(32).toString('hex')),
            fullName: profile.displayName || email.split('@')[0],
            email: email,
            emailVerified: true,
            phone: '',
            role: 'rider',
            accountStatus: 'active',
            profileImageUrl: profile.photos?.[0]?.value || null,
          });

          return done(null, newUser);
        } catch (err) {
          console.error('❌ Google OAuth error:', err);
          return done(err);
        }
      }
    )
  );
}

// ========================
// API Routes
// ========================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    hasGoogleOAuth: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    hasDatabase: !!process.env.DATABASE_URL,
    baseUrl: process.env.BASE_URL || 'not set'
  });
});

// Auth status
app.get('/api/user', (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  res.json(sanitizeUser(req.user));
});

// Login
app.post('/api/login', (req, res, next) => {
  passport.authenticate('local', (err: any, user: any, info: any) => {
    if (err) {
      console.error('Login error:', err);
      return res.status(500).json({ message: 'Authentication error' });
    }
    if (!user) {
      return res.status(401).json({ message: info?.message || 'Invalid credentials' });
    }
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error('Session login error:', loginErr);
        return res.status(500).json({ message: 'Login error' });
      }
      res.json(sanitizeUser(user));
    });
  })(req, res, next);
});

// Logout
app.post('/api/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Logout error' });
    }
    req.session.destroy((sessionErr) => {
      res.json({ message: 'Logout successful' });
    });
  });
});

// Google OAuth routes
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  // Store role preference before OAuth redirect
  app.get('/api/auth/google', (req, res, next) => {
    console.log('🔐 Starting Google OAuth flow...');
    const role = req.query.role as string;
    if (role && (role === 'rider' || role === 'driver')) {
      (req.session as any).oauthSignupRole = role;
      console.log('📝 Stored OAuth signup role:', role);
    }
    // Save session before OAuth redirect
    req.session.save((err) => {
      if (err) console.error('Session save error:', err);
      passport.authenticate('google', { 
        scope: ['profile', 'email']
      })(req, res, next);
    });
  });

  app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/auth?error=oauth_failed' }),
    async (req, res) => {
      console.log('✅ Google OAuth callback received');
      const user = req.user as any;
      const signupRole = (req.session as any).oauthSignupRole;
      const isNewUser = !user.phone || user.phone === '';
      
      if (isNewUser && signupRole) {
        try {
          await updateUser(user.id, { role: signupRole });
          user.role = signupRole;
          console.log('📝 Updated new user role to:', signupRole);
        } catch (err) {
          console.error('Failed to update user role:', err);
        }
      }
      
      delete (req.session as any).oauthSignupRole;
      
      req.session.save((err) => {
        if (err) console.error('Failed to save session:', err);
        
        // Determine redirect based on user state
        const baseUrl = process.env.BASE_URL || '';
        let redirectPath: string;
        
        if (isNewUser) {
          redirectPath = user.role === 'driver' ? '/driver/onboarding' : '/rider/onboarding';
        } else {
          if (user.role === 'rider') {
            redirectPath = '/rider/dashboard';
          } else if (user.role === 'driver') {
            redirectPath = '/driver/dashboard';
          } else if (user.role === 'admin') {
            redirectPath = '/admin/dashboard';
          } else {
            redirectPath = '/';
          }
        }
        
        console.log('🔀 Redirecting to:', baseUrl + redirectPath);
        res.redirect(baseUrl + redirectPath);
      });
    }
  );
  
  console.log('✅ Google OAuth routes registered');
} else {
  app.get('/api/auth/google', (req, res) => {
    res.status(503).json({ 
      error: 'Google OAuth is not configured',
      message: 'Please ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set'
    });
  });
}

// OAuth status check
app.get('/api/auth/google/status', (req, res) => {
  res.json({
    available: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    callbackUrl: process.env.BASE_URL 
      ? `${process.env.BASE_URL}/api/auth/google/callback`
      : '/api/auth/google/callback'
  });
});

// Catch-all for unhandled API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('API Error:', err);
  res.status(err.status || 500).json({ 
    message: err.message || 'Internal Server Error' 
  });
});

// Export for Vercel serverless function
export default app;

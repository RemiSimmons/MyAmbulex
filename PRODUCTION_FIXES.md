# Production OAuth & Login Fixes

This document outlines the fixes applied to resolve OAuth and login issues when deploying from Replit to production.

## Issues Fixed

### 1. DATABASE_URL Error Handling ✅
- **Problem**: Server crashed immediately if DATABASE_URL wasn't set
- **Fix**: Improved error message with helpful instructions
- **Location**: `server/db.ts`

### 2. OAuth Callback URL ✅
- **Problem**: Hardcoded relative callback URL `/api/auth/google/callback` doesn't work in production
- **Fix**: Now uses `BASE_URL` environment variable if set, otherwise falls back to relative URL
- **Location**: `server/auth.ts`

### 3. Session Cookie Secure Flag ✅
- **Problem**: Session cookies weren't being set as secure behind proxies (Vercel, Railway, etc.)
- **Fix**: Now checks `req.secure`, `x-forwarded-proto` header, and protocol to determine if request is HTTPS
- **Location**: `server/auth.ts`, `server/routes/auth.ts`

## Required Environment Variables for Production

### Critical (Must Set)

1. **DATABASE_URL**
   ```
   DATABASE_URL=postgresql://user:password@host:5432/database
   ```
   - Your PostgreSQL connection string
   - Required for the app to start

2. **BASE_URL** (NEW - Required for OAuth)
   ```
   BASE_URL=https://yourdomain.com
   ```
   - Your production domain (without trailing slash)
   - Used to construct OAuth callback URL
   - Example: `https://myambulex.com` or `https://myapp.railway.app`

3. **SESSION_SECRET**
   ```
   SESSION_SECRET=your-random-secret-key-here
   ```
   - Random string for session encryption
   - Generate with: `openssl rand -base64 32`

4. **GOOGLE_CLIENT_ID** & **GOOGLE_CLIENT_SECRET**
   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```
   - From Google Cloud Console

### Important: Update Google OAuth Redirect URI

After setting `BASE_URL`, you **must** update your Google OAuth client settings:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, add:
   ```
   https://yourdomain.com/api/auth/google/callback
   ```
   (Replace `yourdomain.com` with your actual domain)

5. **Remove old Replit redirect URIs** if you're no longer using Replit:
   ```
   https://your-replit-app.replit.app/api/auth/google/callback
   ```

## Platform-Specific Setup

### Railway / Render / Fly.io

These platforms typically set environment variables through their dashboards:

1. **Set all required environment variables** in your platform's dashboard
2. **Make sure `BASE_URL` matches your deployed URL**:
   - Railway: `https://your-app.railway.app`
   - Render: `https://your-app.onrender.com`
   - Fly.io: `https://your-app.fly.dev`

3. **Trust Proxy**: Already configured in code (`app.set("trust proxy", 1)`)

### Vercel (If deploying full app)

If deploying the Express app to Vercel (not recommended, but possible):

1. Set environment variables in Vercel dashboard
2. Vercel automatically sets `x-forwarded-proto` header
3. The code already handles this correctly

## Testing OAuth in Production

1. **Check OAuth status endpoint**:
   ```
   GET https://yourdomain.com/api/auth/google/status
   ```
   Should return: `{ "available": true }`

2. **Test OAuth flow**:
   - Navigate to: `https://yourdomain.com/api/auth/google`
   - Should redirect to Google login
   - After login, should redirect back to your app

3. **Check browser console** for any cookie errors
4. **Check server logs** for OAuth callback URL being used

## Troubleshooting

### OAuth redirects to wrong URL

- **Check**: `BASE_URL` environment variable is set correctly
- **Check**: Google Cloud Console has the correct redirect URI
- **Check**: No trailing slash in `BASE_URL`

### Session cookies not working

- **Check**: `SESSION_SECRET` is set
- **Check**: Server logs show `secure: true` for HTTPS requests
- **Check**: Browser DevTools → Application → Cookies shows cookie is set
- **Check**: Cookie has `Secure` flag in production

### Login works but session doesn't persist

- **Check**: Session store is configured (database or Redis)
- **Check**: `SESSION_SECRET` is the same across all instances (if using multiple servers)
- **Check**: CORS settings allow credentials

### DATABASE_URL error

- **Check**: Environment variable is set in your deployment platform
- **Check**: Connection string format is correct
- **Check**: Database is accessible from your deployment platform (firewall rules)

## Verification Checklist

Before going live, verify:

- [ ] `DATABASE_URL` is set and working
- [ ] `BASE_URL` is set to your production domain
- [ ] `SESSION_SECRET` is set (and is random/secure)
- [ ] `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- [ ] Google OAuth redirect URI matches `{BASE_URL}/api/auth/google/callback`
- [ ] OAuth status endpoint returns `{ "available": true }`
- [ ] Can log in with email/password
- [ ] Can log in with Google OAuth
- [ ] Session persists after login
- [ ] Can access protected routes after login

## Code Changes Summary

### Files Modified:
1. `server/db.ts` - Better error message for missing DATABASE_URL
2. `server/auth.ts` - Dynamic OAuth callback URL, proxy-aware secure cookies
3. `server/routes/auth.ts` - Proxy-aware secure cookie setting

### Key Changes:
- OAuth callback URL now uses `BASE_URL` environment variable
- Session cookies now properly detect HTTPS behind proxies
- Better error messages for missing configuration



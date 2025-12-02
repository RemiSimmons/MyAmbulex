# Google OAuth Error Fix

## Error: "OAuth client was not found" (401: invalid_client)

This error means Google can't find your OAuth client. Here's how to fix it:

## 🔍 Common Causes

1. **Redirect URI mismatch** - Your localhost URL isn't registered in Google Cloud Console
2. **Wrong credentials** - Client ID/Secret don't match what's in Google Cloud Console
3. **OAuth consent screen not configured** - App needs to be set up in Google Cloud Console

## ✅ Fix Steps

### Step 1: Check Google Cloud Console

1. **Go to**: https://console.cloud.google.com/
2. **Select your project** (or create one)
3. **Navigate to**: APIs & Services → Credentials
4. **Find your OAuth 2.0 Client ID** (the one matching your `GOOGLE_CLIENT_ID`)

### Step 2: Add Authorized Redirect URIs

In your OAuth client settings, add these redirect URIs:

**For Local Development:**
```
http://localhost:3000/api/auth/google/callback
```

**For Production (when ready):**
```
https://yourdomain.com/api/auth/google/callback
```

**If you were using Replit:**
```
https://your-replit-app.replit.app/api/auth/google/callback
```

### Step 3: Verify OAuth Consent Screen

1. **Go to**: APIs & Services → OAuth consent screen
2. **Make sure**:
   - App name is set
   - User support email is set
   - Authorized domains (if needed)
   - **Scopes**: Make sure these are added:
     - `email`
     - `profile`
     - `openid`

### Step 4: Verify Your Credentials

1. **Check** that `GOOGLE_CLIENT_ID` in `.env` matches the Client ID in Google Cloud Console
2. **Check** that `GOOGLE_CLIENT_SECRET` matches the Client Secret
3. **Make sure** there are no extra spaces or quotes in `.env`

### Step 5: Restart Server

After making changes:

```bash
# Stop server (Ctrl+C)
npm run dev
```

## 🔧 Quick Test

Try accessing:
```
http://localhost:3000/api/auth/google
```

You should be redirected to Google's login page. If you still get the error, the redirect URI isn't configured correctly.

## 📋 Current Configuration

Your `.env` has:
- `GOOGLE_CLIENT_ID` ✅
- `GOOGLE_CLIENT_SECRET` ✅

**Callback URL should be**: `http://localhost:3000/api/auth/google/callback`

Make sure this exact URL is in your Google Cloud Console OAuth client settings!

## ⚠️ Important Notes

- **Redirect URIs are case-sensitive** - Must match exactly
- **No trailing slashes** - Don't add `/` at the end
- **HTTP vs HTTPS** - Use `http://` for localhost, `https://` for production
- **Port must match** - If your server runs on port 3000, use port 3000 in the redirect URI

## 🚀 After Fixing

Once you've added the redirect URI in Google Cloud Console:
1. Wait a few minutes for changes to propagate
2. Restart your server
3. Try logging in with Google again

The error should be resolved! 🎉


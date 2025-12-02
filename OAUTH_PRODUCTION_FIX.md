# OAuth Not Working on Live Site - Fix Guide

## 🔴 Main Issue: Missing BASE_URL

Your OAuth works on localhost but not production because **`BASE_URL` is not set in Vercel**.

## Why OAuth Works Locally But Not Production

### Localhost (Works ✅):
- Uses relative URL: `/api/auth/google/callback`
- Browser automatically resolves to: `http://localhost:3000/api/auth/google/callback`
- Google OAuth redirect URI matches: `http://localhost:3000/api/auth/google/callback`

### Production (Broken ❌):
- Without `BASE_URL`, code uses relative URL: `/api/auth/google/callback`
- Browser resolves to: `https://myambulex.com/api/auth/google/callback` ✅ (correct)
- BUT: Google OAuth might not have this redirect URI registered ❌
- AND: Session cookies might not be set correctly due to missing BASE_URL context

## ✅ Fix Steps

### Step 1: Add BASE_URL to Vercel (CRITICAL)

**Option A: Via Vercel Dashboard (Easiest)**
1. Go to: https://vercel.com/remi-westaymovings-projects/my-ambulex/settings/environment-variables
2. Click **"Add New"**
3. **Key**: `BASE_URL`
4. **Value**: `https://myambulex.com`
5. **Environment**: Select all (Production, Preview, Development)
6. Click **"Save"**
7. **Redeploy** your site (or wait for next deployment)

**Option B: Via Vercel CLI**
```bash
npx vercel env add BASE_URL production
# When prompted, enter: https://myambulex.com
```

### Step 2: Update Google OAuth Redirect URI

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **"Authorized redirect URIs"**, make sure you have:
   ```
   https://myambulex.com/api/auth/google/callback
   ```
5. If missing, click **"Add URI"** and add it
6. Click **"Save"**

### Step 3: Verify Environment Variables

Check that these are set in Vercel:
- ✅ `BASE_URL` = `https://myambulex.com`
- ✅ `GOOGLE_CLIENT_ID` = (your client ID)
- ✅ `GOOGLE_CLIENT_SECRET` = (your client secret)
- ✅ `SESSION_SECRET` = (random secret)
- ✅ `DATABASE_URL` = (your database connection)

### Step 4: Redeploy

After adding `BASE_URL`:
```bash
# Trigger a new deployment
git commit --allow-empty -m "Trigger redeploy after adding BASE_URL"
git push origin main
```

Or redeploy from Vercel dashboard.

## 🔍 Troubleshooting

### Check OAuth Status
Visit: `https://myambulex.com/api/auth/google/status`
Should return: `{"available":true}`

### Check Server Logs
1. Go to Vercel Dashboard → Deployments → Latest
2. Click **"View Function Logs"**
3. Look for OAuth-related errors

### Common Errors:

**Error: "redirect_uri_mismatch"**
- ❌ Google OAuth redirect URI doesn't match
- ✅ Fix: Add `https://myambulex.com/api/auth/google/callback` to Google Cloud Console

**Error: "OAuth client was not found"**
- ❌ Wrong GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET
- ✅ Fix: Verify credentials in Vercel match Google Cloud Console

**Session not persisting after OAuth**
- ❌ Cookie settings issue (secure flag, sameSite)
- ✅ Fix: Already handled in code, but ensure BASE_URL is set

**Callback URL mismatch**
- ❌ BASE_URL not set, so callback URL is wrong
- ✅ Fix: Set BASE_URL = https://myambulex.com

## 🧪 Test After Fix

1. Visit: `https://myambulex.com/api/auth/google`
2. Should redirect to Google login
3. After login, should redirect back to your site
4. Should be logged in

## 📋 Quick Checklist

- [ ] `BASE_URL` set in Vercel = `https://myambulex.com`
- [ ] Google OAuth redirect URI added = `https://myambulex.com/api/auth/google/callback`
- [ ] All environment variables set in Vercel
- [ ] Site redeployed after adding BASE_URL
- [ ] Test OAuth flow end-to-end


# Complete Environment Variables Checklist

## ✅ Currently Set (13 variables)
- `DATABASE_URL` ✅
- `SENDGRID_API_KEY` ✅
- `TWILIO_ACCOUNT_SID` ✅
- `TWILIO_AUTH_TOKEN` ✅
- `TWILIO_PHONE_NUMBER` ✅
- `STRIPE_SECRET_KEY` ✅
- `STRIPE_PUBLISHABLE_KEY` ✅
- `VITE_STRIPE_PUBLIC_KEY` ✅
- `VITE_GOOGLE_MAPS` ✅
- `GOOGLE_CLIENT_ID` ✅
- `GOOGLE_CLIENT_SECRET` ✅
- `SESSION_SECRET` ✅
- `ADMIN_INITIAL_PASSWORD` ✅

---

## 🔴 Potentially Missing (Check Replit Secrets)

### PayPal (Optional - Only if using PayPal payments)
- `PAYPAL_CLIENT_ID` - PayPal API client ID
- `PAYPAL_CLIENT_SECRET` - PayPal API client secret

### Google Cloud Storage (If using file uploads to GCS)
- `GOOGLE_CLOUD_STORAGE_BUCKET` - GCS bucket name
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to GCS service account JSON

### Object Storage (If using Replit's object storage)
- `DEFAULT_OBJECT_STORAGE_BUCKET_ID` - Object storage bucket ID
- `PUBLIC_OBJECT_SEARCH_PATHS` - Public object paths
- `PRIVATE_OBJECT_DIR` - Private object directory

### Stripe Webhook (Optional - Only if using Stripe webhooks)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret

### URLs (Optional - Has defaults)
- `BASE_URL` - Base URL for callbacks (defaults to request host)
- `APP_URL` - App URL for email links (defaults to BASE_URL)
- `REPLIT_DOMAINS` - Replit domain (not needed locally, was for Replit)

### Admin Setup (Optional - Has defaults)
- `ADMIN_INITIAL_EMAIL` - Admin email (defaults to admin@myambulex.com)

### Other Optional Variables
- `PORT` - Server port (defaults to 3000, you're good)
- `NODE_ENV` - Environment (set automatically by npm run dev)
- `USE_NEON` - Force Neon driver (not needed, auto-detected)

---

## 🟡 Frontend Variables (VITE_ prefix)

### Already Set
- `VITE_STRIPE_PUBLIC_KEY` ✅
- `VITE_GOOGLE_MAPS` ✅

### Optional
- `VITE_VAPID_PUBLIC_KEY` - Push notifications (optional)

---

## 📋 What to Check in Replit Secrets

Based on your Replit setup, check for these in your Replit secrets:

### High Priority (If you used these features)
1. **PayPal** - `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`
2. **Google Cloud Storage** - `GOOGLE_CLOUD_STORAGE_BUCKET`, `GOOGLE_APPLICATION_CREDENTIALS`
3. **Object Storage** - `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR`

### Medium Priority
4. **VAPID Keys** - `VITE_VAPID_PUBLIC_KEY` (if you set up push notifications)

### Low Priority (Usually auto-set)
5. **Port/Environment** - `PORT`, `NODE_ENV` (not critical, defaults work)

---

## 🎯 Quick Transfer Guide

### Step 1: Check Replit Secrets
In Replit, go to: **Secrets** tab

### Step 2: Compare with This List
Look for any of the variables listed above that aren't in your `.env` file

### Step 3: Add Missing Ones
For each missing variable:
1. Copy the value from Replit
2. Add to your `.env` file:
   ```bash
   VARIABLE_NAME=value_here
   ```

### Step 4: Restart Server
After adding variables, restart:
```bash
npm run dev
```

---

## ⚠️ Important Notes

1. **PayPal**: Only needed if you want PayPal payment option (currently disabled in beta)
2. **Google Cloud Storage**: Only needed if you're storing files in GCS instead of local storage
3. **Object Storage**: Only needed if you used Replit's object storage feature
4. **VAPID**: Only needed for browser push notifications

**Most apps work fine without PayPal, GCS, or Object Storage!**

---

## ✅ Current Status

Your app should be **fully functional** with what you have now. The missing variables are only needed for:
- PayPal payments (optional)
- Cloud file storage (optional)
- Push notifications (optional)

**You're good to go!** 🚀


# Environment Variables Needed

## ✅ Already Added
- `DATABASE_URL` - Supabase connection string
- `SENDGRID_API_KEY` - Email notifications
- `TWILIO_ACCOUNT_SID` - SMS notifications
- `TWILIO_AUTH_TOKEN` - SMS notifications
- `STRIPE_SECRET_KEY` - Backend Stripe (server-side)
- `STRIPE_PUBLISHABLE_KEY` - Backend Stripe (server-side)

## 🔴 Required for Frontend (Add These Now)

### 1. VITE_STRIPE_PUBLIC_KEY (Required - Currently Missing)
- **Purpose**: Stripe payment processing in the browser
- **Where to get**: Same as `STRIPE_PUBLISHABLE_KEY` (they're the same value)
- **Action**: Copy your `STRIPE_PUBLISHABLE_KEY` value to `VITE_STRIPE_PUBLIC_KEY`

### 2. VITE_GOOGLE_MAPS (Required for Location Features)
- **Purpose**: Google Maps API for address search, directions, etc.
- **Where to get**: Google Cloud Console → APIs & Services → Credentials
- **Action**: Add your Google Maps API key

## 🟡 Optional (Add Later If Needed)

### VITE_VAPID_PUBLIC_KEY
- **Purpose**: Push notifications in browser
- **Where to get**: Generated when setting up push notifications
- **Action**: Only needed if you want browser push notifications

---

## Quick Fix for Current Error

The error is about missing `VITE_STRIPE_PUBLIC_KEY`. 

**Quick solution**: Copy your `STRIPE_PUBLISHABLE_KEY` value and add it as `VITE_STRIPE_PUBLIC_KEY`:

```bash
# In your .env file, add:
VITE_STRIPE_PUBLIC_KEY=<same_value_as_STRIPE_PUBLISHABLE_KEY>
```

**Note**: The `VITE_` prefix is important - it tells Vite to expose this variable to the frontend code.

---

## After Adding Variables

After adding the frontend variables, restart the dev server:
1. Stop the current server (Ctrl+C)
2. Run `npm run dev` again
3. The frontend should load without errors


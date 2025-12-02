# Environment Variables Setup Guide

## ✅ Current Setup (Good!)

Your `.gitignore` already protects your `.env` file from being committed to git. This is the correct setup.

## 📁 Local Development (Keep `.env` in folder)

**Keep your `.env` file in the project root** for local development:

```
MyAmbulex/
├── .env              ← Keep this locally (NOT committed to git)
├── .gitignore        ← Already excludes .env ✅
├── server/
└── client/
```

### Why keep `.env` locally?
- ✅ Easy to edit and test locally
- ✅ Works with `dotenv/config` (already configured)
- ✅ Safe because `.gitignore` prevents committing it
- ✅ Each developer can have their own values

### Your `.env` file should contain:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/myambulex_dev

# OAuth (use test/development credentials)
GOOGLE_CLIENT_ID=your-dev-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-dev-secret

# Session
SESSION_SECRET=dev-secret-key-change-in-production

# Stripe (use test mode keys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_PUBLIC_KEY=pk_test_...

# Other services...
SENDGRID_API_KEY=your-dev-key
TWILIO_ACCOUNT_SID=your-dev-sid
# etc.
```

## ☁️ Production on Vercel (Use Vercel Dashboard)

**Never commit `.env` to git. Instead, set variables in Vercel:**

### How to Set Environment Variables in Vercel:

1. **Go to your Vercel project dashboard**
2. **Navigate to**: Settings → Environment Variables
3. **Add each variable**:
   - Variable name: `DATABASE_URL`
   - Value: `postgresql://user:password@host:5432/database`
   - Environment: Select `Production`, `Preview`, and/or `Development`
   - Click "Save"

4. **Repeat for all required variables**:
   - `DATABASE_URL`
   - `BASE_URL` ← **NEW - Required for OAuth!**
   - `SESSION_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PUBLISHABLE_KEY`
   - `VITE_STRIPE_PUBLIC_KEY`
   - `VITE_GOOGLE_MAPS`
   - `SENDGRID_API_KEY`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
   - And any others you need

### Important Notes for Vercel:

1. **`BASE_URL` is critical** - Set it to your production domain:
   ```
   BASE_URL=https://yourdomain.com
   ```
   (No trailing slash)

2. **Frontend variables** (those with `VITE_` prefix) are automatically exposed to the browser
   - `VITE_STRIPE_PUBLIC_KEY` ✅
   - `VITE_GOOGLE_MAPS` ✅

3. **Backend variables** (no `VITE_` prefix) are server-only:
   - `DATABASE_URL` ✅ (server-only, secure)
   - `STRIPE_SECRET_KEY` ✅ (server-only, secure)
   - `GOOGLE_CLIENT_SECRET` ✅ (server-only, secure)

4. **After adding variables**, redeploy your app:
   - Vercel will automatically use the new variables
   - Or trigger a new deployment manually

## 🔒 Security Best Practices

### ✅ DO:
- ✅ Keep `.env` locally for development
- ✅ Set variables in Vercel dashboard for production
- ✅ Use different credentials for dev vs production
- ✅ Rotate secrets regularly
- ✅ Use strong, random `SESSION_SECRET`

### ❌ DON'T:
- ❌ **Never commit `.env` to git** (already protected ✅)
- ❌ **Never share `.env` files** in chat/email
- ❌ **Never use production secrets** in local `.env`
- ❌ **Never hardcode secrets** in code

## 📋 Quick Checklist

### Local Development:
- [ ] `.env` file exists in project root
- [ ] `.env` is in `.gitignore` ✅ (already done)
- [ ] `.env` contains development/test credentials
- [ ] Can run `npm run dev` successfully

### Production (Vercel):
- [ ] All variables set in Vercel dashboard
- [ ] `BASE_URL` set to production domain
- [ ] Using production credentials (not test keys)
- [ ] Variables set for correct environments (Production/Preview)
- [ ] App deployed and working

## 🔄 Migrating from Replit

If you're migrating from Replit:

1. **Export your Replit secrets**:
   - Go to Replit → Secrets
   - Copy each value

2. **Add to Vercel**:
   - Paste each value into Vercel Environment Variables
   - Make sure to update `BASE_URL` to your new domain

3. **Update Google OAuth**:
   - Update redirect URI in Google Cloud Console
   - Change from: `https://your-app.replit.app/api/auth/google/callback`
   - Change to: `https://yourdomain.com/api/auth/google/callback`

## 🧪 Testing

### Test Local Setup:
```bash
# Make sure .env exists
ls -la .env

# Start dev server
npm run dev

# Should load without errors
```

### Test Production Setup:
1. Deploy to Vercel
2. Check deployment logs for any missing variables
3. Test OAuth login (should work with correct `BASE_URL`)
4. Check browser console for any frontend variable errors

## 📝 Example `.env` Template

Create a `.env.example` file (this CAN be committed) as a template:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Session
SESSION_SECRET=change-this-to-a-random-secret

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_PUBLIC_KEY=pk_test_...

# Base URL (for production)
BASE_URL=https://yourdomain.com

# Other services...
SENDGRID_API_KEY=your-api-key
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
VITE_GOOGLE_MAPS=your-google-maps-api-key
```

Then developers can:
```bash
cp .env.example .env
# Edit .env with their own values
```

## 🆘 Troubleshooting

### "Environment variable not found" in production
- ✅ Check Vercel dashboard → Environment Variables
- ✅ Make sure variable is set for "Production" environment
- ✅ Redeploy after adding variables

### "Environment variable not found" locally
- ✅ Check `.env` file exists in project root
- ✅ Check variable name matches exactly (case-sensitive)
- ✅ Restart dev server after changing `.env`

### OAuth not working in production
- ✅ Check `BASE_URL` is set correctly in Vercel
- ✅ Check Google OAuth redirect URI matches `{BASE_URL}/api/auth/google/callback`
- ✅ Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set

## Summary

**Local Development**: Keep `.env` file in project folder ✅  
**Production (Vercel)**: Set variables in Vercel dashboard ✅  
**Never commit `.env`**: Already protected by `.gitignore` ✅


# Deploy to Vercel - Step by Step Guide

## Method 1: GitHub Integration (Recommended - Auto-Deploy)

This is the easiest way and will enable automatic deployments on every push.

### Steps:

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/new
   - Sign in with GitHub (if not already signed in)

2. **Import Your Repository**
   - Click **"Import Git Repository"**
   - Find and select: `RemiSimmons/MyAmbulex`
   - Click **"Import"**

3. **Configure Project**
   - **Framework Preset**: Leave as "Other" or "Vite"
   - **Root Directory**: Leave as `./` (root)
   - **Build Command**: `npm run build` (should auto-detect)
   - **Output Directory**: `dist/public` (should auto-detect from vercel.json)
   - **Install Command**: `npm install` (should auto-detect)

4. **Add Environment Variables**
   - Click **"Environment Variables"**
   - Add all your required variables:
     - `DATABASE_URL`
     - `BASE_URL` ← **CRITICAL for OAuth!**
     - `SESSION_SECRET`
     - `GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`
     - `STRIPE_SECRET_KEY`
     - `STRIPE_PUBLISHABLE_KEY`
     - `VITE_STRIPE_PUBLIC_KEY`
     - `VITE_GOOGLE_MAPS`
     - And all others...

5. **Deploy**
   - Click **"Deploy"**
   - Wait for build to complete
   - Your site will be live!

6. **Enable Auto-Deployments**
   - After first deployment, go to **Settings → Git**
   - Make sure **"Production Branch"** is set to `main`
   - Auto-deployments should be enabled by default

---

## Method 2: Vercel CLI (Manual Deploy)

If you prefer using CLI:

### Install Vercel CLI:
```bash
npm install --save-dev vercel
```

### Deploy:
```bash
# Login to Vercel
npx vercel login

# Deploy to preview
npx vercel

# Deploy to production
npx vercel --prod
```

---

## Troubleshooting

### If deployments don't trigger automatically:

1. **Check GitHub Integration**
   - Go to Vercel Dashboard → Settings → Git
   - Verify repository is connected
   - Check that "Production Branch" is `main`

2. **Check Webhook**
   - Go to GitHub → Your Repo → Settings → Webhooks
   - Look for Vercel webhook
   - If missing, reconnect in Vercel settings

3. **Manual Trigger**
   - Go to Vercel Dashboard → Deployments
   - Click "Redeploy" on latest deployment

### If build fails:

1. **Check Build Logs**
   - Go to Deployment → Build Logs
   - Look for errors

2. **Common Issues**:
   - Missing environment variables
   - Build command failing
   - Output directory incorrect

### Verify Image is Included:

After deployment, check:
```
https://yourdomain.com/app-preview-phone.png
```

Should return the image (not 404).

---

## Quick Deploy Commands

Once set up, you can trigger deployments with:

```bash
# Push to GitHub (triggers auto-deploy if connected)
git push origin main

# Or use Vercel CLI
npx vercel --prod
```


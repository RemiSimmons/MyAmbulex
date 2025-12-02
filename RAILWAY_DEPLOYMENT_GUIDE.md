# Railway Backend Deployment Guide

## Step-by-Step: Deploy Express Backend to Railway

### Step 1: Create Railway Account

1. Go to: https://railway.app
2. Click **"Start a New Project"**
3. Sign up with **GitHub** (recommended - easiest)
4. Authorize Railway to access your GitHub account

### Step 2: Create New Project

1. After logging in, click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Find and select: **`RemiSimmons/MyAmbulex`**
4. Click **"Deploy Now"**

### Step 3: Configure Deployment Settings

Railway will auto-detect your project, but verify these settings:

1. Click on your project → **Settings** tab
2. **Root Directory**: Leave as `/` (root)
3. **Build Command**: `npm run build`
4. **Start Command**: `npm start`
5. **Watch Paths**: Leave default

### Step 4: Add Environment Variables

1. In Railway project, go to **Variables** tab
2. Click **"New Variable"**
3. Add each variable one by one:

**Critical Variables (Required):**
```
DATABASE_URL=your-postgresql-connection-string
BASE_URL=https://myambulex.com
SESSION_SECRET=your-random-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**Other Required Variables:**
```
STRIPE_SECRET_KEY=your-stripe-secret
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
SENDGRID_API_KEY=your-sendgrid-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-number
```

**Optional but Recommended:**
```
NODE_ENV=production
PORT=3000
```

4. Click **"Add"** after each variable
5. Railway will automatically redeploy when you add variables

### Step 5: Get Your Backend URL

1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"** (or use the auto-generated one)
3. Copy the URL (e.g., `https://my-ambulex-production.up.railway.app`)
4. **Save this URL** - you'll need it!

### Step 6: Update Vercel Frontend

Now connect your Vercel frontend to the Railway backend:

1. Go to Vercel Dashboard: https://vercel.com/remi-westaymovings-projects/my-ambulex/settings/environment-variables
2. Add new variable:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://your-railway-url.up.railway.app` (use your Railway URL)
   - **Environment**: Production, Preview, Development
3. Click **"Save"**

### Step 7: Update Frontend API Calls (If Needed)

Check if your frontend uses `import.meta.env.VITE_API_URL`:

```bash
# Search for API calls in frontend
grep -r "fetch\|axios" client/src --include="*.tsx" --include="*.ts" | head -5
```

If not, we may need to update the API base URL in your frontend code.

### Step 8: Update Google OAuth Redirect URI

1. Go to Google Cloud Console: https://console.cloud.google.com/apis/credentials
2. Click your OAuth 2.0 Client ID
3. Under **"Authorized redirect URIs"**, add:
   ```
   https://your-railway-url.up.railway.app/api/auth/google/callback
   ```
   (Use your actual Railway URL)
4. Also keep: `https://myambulex.com/api/auth/google/callback` (if using proxy)
5. Click **"Save"**

### Step 9: Test the Connection

1. **Test Backend Health:**
   ```bash
   curl https://your-railway-url.up.railway.app/api/health
   ```
   Should return JSON with status info

2. **Test OAuth Status:**
   ```bash
   curl https://your-railway-url.up.railway.app/api/auth/google/status
   ```
   Should return: `{"available":true}`

3. **Test from Frontend:**
   - Visit: `https://myambulex.com`
   - Try logging in
   - Check browser console for API calls

### Step 10: Redeploy Frontend

After adding `VITE_API_URL`:
1. Go to Vercel Dashboard → Deployments
2. Click **"Redeploy"** on latest deployment
3. Or push a new commit to trigger auto-deploy

## Troubleshooting

### Backend Not Starting
- Check Railway logs: Project → **Deployments** → Click latest → **View Logs**
- Look for errors in startup
- Verify `DATABASE_URL` is correct
- Check `npm start` command works locally

### Frontend Can't Connect to Backend
- Verify `VITE_API_URL` is set in Vercel
- Check CORS settings in backend (already configured in `api/index.ts`)
- Check browser console for CORS errors
- Verify Railway URL is correct

### OAuth Not Working
- Verify `BASE_URL` is set in Railway = `https://myambulex.com`
- Check Google OAuth redirect URI matches Railway URL
- Check Railway logs for OAuth errors
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct

### Database Connection Issues
- Verify `DATABASE_URL` format is correct
- Check if database allows connections from Railway IPs
- Check Railway logs for database connection errors

## Quick Checklist

- [ ] Railway account created
- [ ] Project deployed from GitHub
- [ ] All environment variables added to Railway
- [ ] Backend URL obtained from Railway
- [ ] `VITE_API_URL` added to Vercel
- [ ] Google OAuth redirect URI updated
- [ ] Frontend redeployed
- [ ] Tested backend health endpoint
- [ ] Tested OAuth flow

## Next Steps After Deployment

1. Set up custom domain for Railway (optional)
2. Configure monitoring/alerts
3. Set up database backups
4. Configure auto-scaling (if needed)


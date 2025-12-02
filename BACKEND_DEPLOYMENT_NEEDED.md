# ⚠️ Backend Deployment Required

## Problem

Your Express backend is **not running** on Vercel. Vercel is only serving static frontend files, which is why:
- ❌ OAuth doesn't work
- ❌ API routes return HTML instead of JSON
- ❌ Login doesn't work
- ❌ No backend functionality

## Solution: Deploy Backend Separately

You need to deploy your Express backend to a platform that supports Node.js servers.

### Recommended: Railway (Easiest)

1. **Go to**: https://railway.app
2. **Sign up** with GitHub
3. **New Project** → **Deploy from GitHub**
4. **Select**: `RemiSimmons/MyAmbulex`
5. **Settings**:
   - **Root Directory**: Leave as `/`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Port**: Auto-detected

6. **Add Environment Variables**:
   - Copy all from your `.env` file
   - **Important**: Set `BASE_URL=https://myambulex.com`
   - Set `PORT=3000` (or let Railway auto-detect)

7. **Get Backend URL**:
   - Railway will give you: `https://your-app.railway.app`
   - Copy this URL

8. **Update Frontend**:
   - Add `VITE_API_URL` environment variable in Vercel
   - Value: `https://your-app.railway.app`
   - Update frontend API calls to use this URL

### Alternative: Render

1. Go to: https://render.com
2. New → Web Service
3. Connect GitHub → Select repo
4. Settings:
   - Build: `npm run build`
   - Start: `npm start`
5. Add environment variables
6. Deploy

### Alternative: Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch
fly launch

# Deploy
fly deploy
```

## After Backend is Deployed

1. **Update Vercel Environment Variables**:
   - Add `VITE_API_URL=https://your-backend-url.com`

2. **Update Frontend API Calls**:
   - Check if frontend uses `import.meta.env.VITE_API_URL`
   - If not, we'll need to update the API base URL

3. **Test**:
   - Visit: `https://your-backend-url.com/api/auth/google/status`
   - Should return: `{"available":true}`

4. **Update Google OAuth**:
   - Add redirect URI: `https://your-backend-url.com/api/auth/google/callback`
   - Or keep using `https://myambulex.com/api/auth/google/callback` if you set up a proxy

## Quick Test

To verify backend is needed, try:
```bash
curl https://myambulex.com/api/auth/google/status
```

If it returns HTML (not JSON), the backend isn't running.


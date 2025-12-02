# Vercel Deployment Guide

This guide will help you deploy your MyAmbulex application to Vercel.

## Quick Start

### Method 1: Using Vercel CLI (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```
   
   For production:
   ```bash
   vercel --prod
   ```

### Method 2: Using GitHub Integration

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Import to Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Vercel will auto-detect settings from `vercel.json`

3. **Add Environment Variables** (see below)

4. **Deploy**: Vercel will automatically deploy

## Configuration

The `vercel.json` file is already configured for your project:
- **Build Command**: `npm run build`
- **Output Directory**: `dist/public`
- **Framework**: Static (frontend only)

## Important Notes

⚠️ **Current Setup**: This configuration deploys the **frontend only** to Vercel. Your Express backend should be deployed separately to:
- **Railway** (recommended)
- **Render**
- **Fly.io**
- **Heroku**

### Why Frontend Only?

Your application uses:
- Full Express server with WebSockets
- Background services (ride reminders, expiration)
- Long-running processes

These features work better on platforms designed for full Node.js applications.

## Environment Variables

If your frontend needs environment variables, add them in Vercel:

1. Go to your project dashboard on Vercel
2. Navigate to **Settings** → **Environment Variables**
3. Add variables like:
   - `VITE_API_URL` (your backend URL)
   - `VITE_GOOGLE_MAPS_API_KEY`
   - Other frontend-only variables

**Note**: Only variables prefixed with `VITE_` are accessible in Vite frontends.

## Updating API Endpoints

If deploying frontend separately, update your API base URL:

1. Create a `.env.production` file:
   ```env
   VITE_API_URL=https://your-backend-url.com
   ```

2. Or set it in Vercel environment variables

3. Update your API calls to use `import.meta.env.VITE_API_URL`

## Deployment Steps

### 1. Build Locally First (Test)

```bash
npm run build
```

Verify the `dist/public` directory contains your built files.

### 2. Deploy to Vercel

```bash
vercel
```

### 3. Check Deployment

- Visit the URL provided by Vercel
- Check build logs in Vercel dashboard
- Test your application

### 4. Set Up Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions

## Troubleshooting

### Build Fails

- **Check build logs**: Look for specific error messages
- **Test locally**: Run `npm run build` locally first
- **Check dependencies**: Ensure all are in `package.json`

### 404 Errors on Routes

- **Check `vercel.json`**: Ensure rewrites are configured
- **Verify SPA routing**: All routes should redirect to `index.html`

### API Calls Fail

- **Check CORS**: Ensure backend allows requests from Vercel domain
- **Verify API URL**: Check environment variables are set correctly
- **Check network tab**: Look for specific error messages

### Environment Variables Not Working

- **Vite prefix**: Only `VITE_` prefixed variables are accessible
- **Rebuild**: Changes require a new deployment
- **Check spelling**: Variable names are case-sensitive

## Recommended Architecture

For production:

```
┌─────────────┐
│   Frontend  │ → Vercel (Static Hosting)
│  (React)    │
└──────┬──────┘
       │
       │ API Calls
       │
┌──────▼──────┐
│   Backend   │ → Railway/Render (Node.js Server)
│  (Express)  │
└──────┬──────┘
       │
┌──────▼──────┐
│  Database   │ → Supabase/Neon/Railway PostgreSQL
│ (PostgreSQL)│
└─────────────┘
```

## Next Steps

1. ✅ Deploy frontend to Vercel
2. ⬜ Deploy backend to Railway/Render
3. ⬜ Set up environment variables
4. ⬜ Configure custom domain
5. ⬜ Set up monitoring
6. ⬜ Configure CI/CD

## Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)


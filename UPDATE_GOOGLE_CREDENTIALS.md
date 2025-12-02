# Update Google Cloud Credentials for Localhost

## Current Setup

You have:
- ✅ **API Key**: "MyAmbulexReplit" (with 15 APIs enabled)
- ✅ **OAuth Client**: "MyAmbulex" (Web application)

## Steps to Use MyAmbulexReplit API Key

### Step 1: Get the MyAmbulexReplit API Key

1. **Click on "MyAmbulexReplit"** in the API Keys table
2. **Click "Show key"** to reveal the full API key
3. **Copy the key** (it will look like: `AIzaSy...`)

### Step 2: Update Your .env File

Replace the current `VITE_GOOGLE_MAPS` value with the MyAmbulexReplit key:

```bash
VITE_GOOGLE_MAPS=your_myambulexreplit_api_key_here
```

### Step 3: Add Localhost to API Key Restrictions

1. **While viewing the MyAmbulexReplit API key**:
2. **Scroll to "Application restrictions"**
3. **Make sure "HTTP referrers (web sites)" is selected**
4. **Click "Add an item"** and add:
   ```
   http://localhost:3000/*
   http://localhost:3000
   http://127.0.0.1:3000/*
   ```

5. **Keep your existing Replit referrers** (if any):
   ```
   https://*.replit.app/*
   https://*.replit.dev/*
   https://*.replit.co/*
   ```

6. **Click "Save"**

### Step 4: Verify OAuth Client ID

1. **Click on "MyAmbulex" OAuth client**
2. **Check the Client ID** matches what's in your `.env`:
   - Should start with: `234022529338-efpm...`
3. **Under "Authorized redirect URIs"**, make sure you have:
   ```
   http://localhost:3000/api/auth/google/callback
   ```

### Step 5: Restart Server

After updating:
```bash
# Stop server (Ctrl+C)
npm run dev
```

## Quick Checklist

- [ ] Copied MyAmbulexReplit API key
- [ ] Updated `VITE_GOOGLE_MAPS` in `.env`
- [ ] Added localhost referrers to API key restrictions
- [ ] Verified OAuth redirect URI includes localhost
- [ ] Restarted server
- [ ] Tested Google Maps in app

## Benefits of Using MyAmbulexReplit Key

- ✅ Already has 15 APIs enabled (likely includes Maps, Places, Geocoding)
- ✅ Already configured for your app
- ✅ Just needs localhost added to restrictions

After these updates, both Google Maps and Google OAuth should work! 🎉



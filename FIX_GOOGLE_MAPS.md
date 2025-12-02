# Fix Google Maps - Add Localhost to API Key Restrictions

## Problem
Google Maps isn't working because your API key has HTTP referrer restrictions that don't include `localhost`.

## Quick Fix

### Step 1: Go to Google Cloud Console

1. **Open**: https://console.cloud.google.com/
2. **Select your project**
3. **Navigate to**: APIs & Services → Credentials
4. **Find your API key** (the one matching: `AIzaSyDR0GZqoHrRBA0dKEZBD0a0TeJSQuxK6o0`)

### Step 2: Edit API Key Restrictions

1. **Click on your API key** to edit it
2. **Scroll to "Application restrictions"**
3. **Select**: "HTTP referrers (web sites)"
4. **Add these referrers** (one per line):

```
http://localhost:3000/*
http://localhost:3000
http://127.0.0.1:3000/*
http://127.0.0.1:3000
```

**For production** (add these too):
```
https://yourdomain.com/*
https://*.yourdomain.com/*
```

**If you were using Replit** (keep these):
```
https://*.replit.app/*
https://*.replit.dev/*
https://*.replit.co/*
```

### Step 3: Verify API Restrictions

Make sure these APIs are enabled:
- ✅ **Maps JavaScript API**
- ✅ **Places API** (or Places API (New))
- ✅ **Geocoding API**

### Step 4: Check Billing

- Google Maps requires billing to be enabled (even for free tier)
- Make sure billing is set up in your Google Cloud project

### Step 5: Save and Wait

1. **Click "Save"**
2. **Wait 1-2 minutes** for changes to propagate
3. **Refresh your app** and try Google Maps again

## Alternative: Remove Restrictions (Development Only)

For local development, you can temporarily remove all restrictions:

1. In API key settings
2. Under "Application restrictions"
3. Select **"None"** (not recommended for production!)

⚠️ **Warning**: Only do this for development. Always use restrictions in production.

## Test After Fixing

1. **Restart your dev server** (if needed)
2. **Open**: http://localhost:3000
3. **Try**: Address search/autocomplete feature
4. **Check browser console** for any errors

## Common Errors

### "This API key is not authorized"
- **Fix**: Add localhost to HTTP referrers (see Step 2)

### "RefererNotAllowedMapError"
- **Fix**: Add the exact URL pattern to referrers

### "REQUEST_DENIED"
- **Fix**: Check that APIs are enabled (Step 3)

### "Billing not enabled"
- **Fix**: Enable billing in Google Cloud Console

## Current Configuration

- ✅ API Key: `VITE_GOOGLE_MAPS` is set
- ⏳ **Waiting for**: localhost to be added to API key restrictions

## Quick Checklist

- [ ] Added `http://localhost:3000/*` to HTTP referrers
- [ ] Added `http://127.0.0.1:3000/*` to HTTP referrers  
- [ ] Verified Maps JavaScript API is enabled
- [ ] Verified Places API is enabled
- [ ] Verified Geocoding API is enabled
- [ ] Verified billing is enabled
- [ ] Saved changes and waited 1-2 minutes
- [ ] Tested address search in the app

After adding localhost to the restrictions, Google Maps should work! 🗺️



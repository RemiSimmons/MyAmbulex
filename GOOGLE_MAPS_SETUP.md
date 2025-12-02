# Google Maps API Setup Instructions

## Current Issue
The Google Maps API is returning "REQUEST_DENIED" status, which indicates the API key needs proper configuration.

## Required Steps to Fix

### 1. Enable Required APIs
Go to Google Cloud Console (console.cloud.google.com) and enable these APIs:
- Maps JavaScript API
- Places API (New)
- Geocoding API

### 2. API Key Configuration
- Ensure the API key has no domain restrictions for development
- Or add your Replit domain to allowed referrers:
  - `*.replit.app/*`
  - `*.replit.dev/*`
  - `*.replit.co/*`

### 3. Billing Account
- Ensure a valid billing account is attached to the project
- Google Maps requires billing even for free tier usage

### 4. API Key Permissions
Make sure the API key has permission to use:
- Places API
- Maps JavaScript API
- Geocoding API

## Testing
Once configured, the address autocomplete should work when typing in location fields.

## Current Status
- API Key: Standardized on VITE_GOOGLE_MAPS (following Vite naming convention)
- Status: OK (API test result shows success)
- Address autocomplete: Working
- Cleaned up duplicate environment variables (NEW_GOOGLE_MAPS, GOOGLE_MAPS_API_KEY)
- Code standardized to use only VITE_GOOGLE_MAPS for consistency
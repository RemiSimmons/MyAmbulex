# Stripe Webhook Setup Guide

## ✅ What's Been Done

1. **Created webhook endpoint** at `/api/webhooks/stripe`
2. **Added webhook handler** that processes Stripe events
3. **Registered route** in the application

## 🔧 What You Need to Do

### Step 1: Get Your Stripe Webhook Secret

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/
2. **Navigate to**: Developers → Webhooks
3. **Click**: "Add endpoint" (or edit existing endpoint)
4. **Set endpoint URL**: 
   - **For local development**: Use ngrok: `https://your-ngrok-url.ngrok.io/api/webhooks/stripe`
   - **For production**: `https://yourdomain.com/api/webhooks/stripe`
5. **Select events to listen to**:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `charge.refunded`
   - `customer.created`
   - `customer.updated`
   - `account.updated` (for Stripe Connect)
   - `account.application.authorized` (for Stripe Connect)
   - `account.application.deauthorized` (for Stripe Connect)
   - `transfer.created` (for Stripe Connect)
   - `transfer.updated` (for Stripe Connect)
6. **Copy the "Signing secret"** (starts with `whsec_...`)

### Step 2: Add to .env File

Add the webhook secret to your `.env` file:

```bash
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### Step 3: For Local Development (Optional)

To test webhooks locally, use **ngrok**:

1. **Install ngrok**: https://ngrok.com/download
2. **Start your server**: `npm run dev`
3. **In another terminal**, run: `ngrok http 3000`
4. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)
5. **In Stripe Dashboard**, add webhook endpoint: `https://abc123.ngrok.io/api/webhooks/stripe`
6. **Copy the webhook secret** and add to `.env`

### Step 4: Restart Server

After adding `STRIPE_WEBHOOK_SECRET`:

```bash
npm run dev
```

## 📋 Events Handled

The webhook handler processes these events:

### Payment Events
- ✅ `payment_intent.succeeded` - Updates ride status to "paid"
- ✅ `payment_intent.payment_failed` - Notifies rider of failure
- ✅ `payment_intent.canceled` - Updates payment status
- ✅ `charge.refunded` - Handles refunds

### Customer Events
- ✅ `customer.created` - Links Stripe customer to user
- ✅ `customer.updated` - Updates customer info

### Stripe Connect Events
- ✅ `account.updated` - Driver account updates
- ✅ `account.application.authorized` - Driver account authorized
- ✅ `account.application.deauthorized` - Driver account deauthorized
- ✅ `transfer.created` - Transfer to driver created
- ✅ `transfer.updated` - Transfer status updated

## 🔍 Testing Webhooks

### Using Stripe CLI (Recommended)

1. **Install Stripe CLI**: https://stripe.com/docs/stripe-cli
2. **Login**: `stripe login`
3. **Forward webhooks**: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
4. **Copy the webhook secret** from the CLI output
5. **Add to .env**: `STRIPE_WEBHOOK_SECRET=whsec_...`
6. **Trigger test event**: `stripe trigger payment_intent.succeeded`

### Using ngrok + Stripe Dashboard

1. Start ngrok: `ngrok http 3000`
2. Add endpoint in Stripe Dashboard with ngrok URL
3. Use Stripe Dashboard to send test webhooks

## ⚠️ Important Notes

1. **Webhook secret is required** - The endpoint will fail without it
2. **Raw body required** - The webhook route uses `express.raw()` to preserve the raw body for signature verification
3. **HTTPS required** - Stripe only sends webhooks to HTTPS endpoints (use ngrok for local dev)
4. **Signature verification** - All webhooks are verified using the signing secret

## ✅ Current Status

- ✅ Webhook endpoint created: `/api/webhooks/stripe`
- ✅ Webhook handler implemented
- ✅ Route registered
- ⏳ **Waiting for**: `STRIPE_WEBHOOK_SECRET` in `.env` file

## 🚀 Next Steps

1. Get webhook secret from Stripe Dashboard
2. Add `STRIPE_WEBHOOK_SECRET` to `.env`
3. Restart server
4. Test with Stripe CLI or ngrok

Your Stripe webhook setup is complete! 🎉


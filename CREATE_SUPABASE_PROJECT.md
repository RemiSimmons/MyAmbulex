# Create New Supabase Project for MyAmbulex

## Step-by-Step Guide

### 1. Create New Project

1. **In Supabase Dashboard** (https://app.supabase.com/)
2. Click **"New Project"** button (usually top right or in the organization view)
3. Fill in the details:
   - **Name**: `MyAmbulex` (or whatever you prefer)
   - **Database Password**: Create a strong password (save this - you'll need it!)
   - **Region**: Choose closest to you (e.g., `US East (Ohio)` for US)
   - **Pricing Plan**: Select your Pro plan (since you're already paying)

4. Click **"Create new project"**

### 2. Wait for Project Setup
- This takes 1-2 minutes
- Supabase will provision your database

### 3. Get Connection String

Once the project is ready:

1. **Go to Settings** → **Database** (gear icon in left sidebar)
2. **Scroll to "Connection string"** section
3. **Click the "URI" tab**
4. **Copy the connection string**

It will look like:
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

**Important**: Replace `[YOUR-PASSWORD]` with the password you created in step 1!

### 4. Use Connection String

Add it to your `.env` file:
```bash
DATABASE_URL=postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.xxxxx.supabase.co:5432/postgres
```

---

## Quick Setup After Project Creation

Once you have the connection string:

```bash
# 1. Create .env file
cp .env.example .env

# 2. Edit .env and add your DATABASE_URL

# 3. Push schema to database
npm run db:push

# 4. Start server
npm run dev
```

---

## Pro Tip: Use Connection Pooling for Production

For better performance in production, use the **Connection pooling** string instead:
- Go to **Settings** → **Database** → **Connection pooling**
- Use the **Session mode** connection string (port 6543)
- Better for handling multiple connections

But for development, the direct connection (port 5432) is fine!

---

Let me know once you've created the project and I'll help you set it up! 🚀


# Supabase Setup Guide

## Quick Setup (5 minutes)

Since you already have a Supabase Pro account with 100 GB storage, here's how to set it up:

### 1. Get Your Supabase Connection String

1. Go to your Supabase Dashboard: https://app.supabase.com/
2. Select your project (or create a new one for MyAmbulex)
3. Go to **Settings** → **Database**
4. Scroll down to **Connection string** section
5. Copy the **URI** connection string (it looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
   Or use the **Connection pooling** string for better performance:
   ```
   postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

### 2. Create `.env` File

```bash
cp .env.example .env
```

### 3. Add Your Supabase Connection String

Edit `.env` and add:
```bash
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

**Important**: Replace `[YOUR-PASSWORD]` with your actual database password.

### 4. Push Database Schema

```bash
npm run db:push
```

This will create all the tables and indexes in your Supabase database.

### 5. Start Server

```bash
npm run dev
```

The server will start on **http://localhost:3000**

---

## Why Supabase is Better for You

✅ **100 GB storage** (vs Neon's 0.5 GB free)  
✅ **Already paying** - No additional cost  
✅ **Better performance** - Optimized connection pooling  
✅ **Production-ready** - More stable than Neon free tier  
✅ **Centralized** - Manage all your apps in one place  

---

## Connection String Options

### Option 1: Direct Connection (Recommended for Development)
```
postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

### Option 2: Connection Pooling (Recommended for Production)
```
postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**Note**: The code automatically detects Supabase connections and uses the appropriate PostgreSQL driver.

---

## Troubleshooting

### SSL Connection Error
If you get SSL errors, make sure your connection string includes SSL parameters:
```
postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres?sslmode=require
```

### Connection Pooling
For production, use the connection pooling string (port 6543) instead of direct connection (port 5432).

---

## Next Steps

1. ✅ Get Supabase connection string
2. ✅ Add to `.env` file
3. ✅ Run `npm run db:push`
4. ✅ Start server with `npm run dev`

You're all set! 🚀


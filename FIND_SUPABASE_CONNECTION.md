# How to Find Your Supabase Connection String

## Step-by-Step Guide

### Option 1: From Project Dashboard (Easiest)

1. **Make sure you're in a PROJECT, not the organization page**
   - Look for your project name in the left sidebar
   - Click on your project (not the organization)

2. **Go to Settings**
   - Click the gear icon ⚙️ in the left sidebar
   - Or go to: **Settings** → **Database**

3. **Find Connection String**
   - Scroll down to the **Connection string** section
   - You'll see tabs: "URI", "JDBC", "Golang", etc.
   - Click on the **"URI"** tab
   - Copy the connection string

### Option 2: From Database Settings

1. In your project, go to **Settings** → **Database**
2. Look for **Connection info** or **Connection string**
3. You should see something like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```

### Option 3: If You Only See Connection Parameters

If you see separate fields like:
- Host: `db.xxxxx.supabase.co`
- Database: `postgres`
- Port: `5432`
- User: `postgres`
- Password: `[YOUR-PASSWORD]`

You can construct it manually:
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

**Replace:**
- `[YOUR-PASSWORD]` with your actual database password
- `db.xxxxx.supabase.co` with your actual host

### Option 4: Connection Pooling (Better for Production)

1. In **Settings** → **Database**
2. Look for **Connection pooling** section
3. Use the **Session mode** connection string (port 6543)
4. It looks like:
   ```
   postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

---

## What You Need

You need:
- **Host** (e.g., `db.xxxxx.supabase.co`)
- **Database name** (usually `postgres`)
- **Port** (usually `5432` for direct, `6543` for pooling)
- **User** (usually `postgres`)
- **Password** (your database password)

---

## Still Can't Find It?

If you're still on the organization page:
1. Click on your **project name** in the left sidebar
2. Make sure you're inside a specific project
3. Then go to Settings → Database

Or tell me what you see and I can help you construct it!


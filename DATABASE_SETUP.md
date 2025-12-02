# Database Setup Guide

## Option 1: Set Up Free Neon Database (Recommended - 5 minutes)

Neon offers a **free tier** that's perfect for development. Here's how to set it up:

### Steps:

1. **Go to Neon Console**
   - Visit: https://console.neon.tech/
   - Sign up with GitHub, Google, or email (free)

2. **Create a New Project**
   - Click "Create Project"
   - Choose a project name (e.g., "MyAmbulex")
   - Select a region close to you
   - Click "Create Project"

3. **Get Your Connection String**
   - After creating the project, you'll see a connection string that looks like:
     ```
     postgresql://username:password@ep-xxxx-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```
   - Click "Copy" to copy the connection string

4. **Create `.env` File**
   ```bash
   cp .env.example .env
   ```

5. **Add Connection String to `.env`**
   ```bash
   DATABASE_URL=postgresql://username:password@ep-xxxx-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

6. **Push Database Schema**
   ```bash
   npm run db:push
   ```

7. **Start Server**
   ```bash
   npm run dev
   ```

### Neon Free Tier Includes:
- ✅ 0.5 GB storage
- ✅ Unlimited projects
- ✅ Automatic backups
- ✅ Serverless (scales automatically)
- ✅ Perfect for development and small projects

---

## Option 2: Try to Access Replit Database (May Not Work)

If you want to try accessing your Replit database:

1. **Check Replit Secrets**
   - In your Replit project, check if `DATABASE_URL` is stored in Secrets
   - Go to: Tools → Secrets → Look for `DATABASE_URL`
   - If found, copy it to your local `.env` file

2. **Note**: Replit's database might be:
   - Only accessible from within Replit's network
   - Tied to your Replit account
   - May require Replit subscription for external access

**Recommendation**: Use Option 1 (new Neon database) - it's free, easy, and you'll have full control.

---

## Option 3: Export Data from Replit (If You Have Important Data)

If you have important data in your Replit database:

1. **Export from Replit** (if possible):
   ```bash
   # In Replit terminal
   pg_dump $DATABASE_URL > backup.sql
   ```

2. **Import to New Neon Database**:
   ```bash
   # After setting up new Neon database
   psql $DATABASE_URL < backup.sql
   ```

---

## Quick Start (Once You Have DATABASE_URL)

```bash
# 1. Create .env file
cp .env.example .env

# 2. Edit .env and add your DATABASE_URL
# DATABASE_URL=your_neon_connection_string_here

# 3. Push schema to database
npm run db:push

# 4. Start server
npm run dev
```

The server will start on **http://localhost:3000**


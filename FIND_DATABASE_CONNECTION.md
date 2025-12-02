# Finding Database Connection String in Supabase

## You're in the Wrong Section!

You're currently in **Project Settings** → **General settings**.  
You need to go to **Database Settings** instead.

## How to Find It:

### Step 1: Navigate to Database Settings

1. **Look at the LEFT SIDEBAR** (not the main content area)
2. Find and click on **"Settings"** (gear icon ⚙️)
3. In the Settings submenu, click on **"Database"**

   OR

   Look for **"Database"** in the left sidebar and click it directly

### Step 2: Find Connection String

Once you're in **Settings → Database**, scroll down to find:

**"Connection string"** section with tabs:
- URI
- JDBC  
- Golang
- etc.

Click the **"URI"** tab and copy that string.

---

## Alternative: If You See Connection Info Instead

If you see separate fields like:
- **Host**
- **Database name**
- **Port**
- **User**
- **Password**

You can construct it manually:
```
postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]
```

---

## Quick Navigation Path:

**Left Sidebar** → **Settings** (⚙️) → **Database** → Scroll to **"Connection string"** → **"URI" tab**

The API keys you found are for Supabase's REST API, not the database connection!


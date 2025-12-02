# Supabase Storage Setup Guide

## Quick Setup (10 minutes)

### Step 1: Get Supabase Credentials

1. Go to your Supabase Dashboard: https://app.supabase.com/
2. Select your **MyAmbulex** project
3. Go to **Settings** → **API**
4. Copy these values:
   - **Project URL** (SUPABASE_URL)
   - **Service Role Key** (SUPABASE_SERVICE_ROLE_KEY) - ⚠️ Keep this secret!

### Step 2: Create Storage Bucket

1. In Supabase Dashboard, go to **Storage** (left sidebar)
2. Click **"New bucket"**
3. Configure:
   - **Name**: `driver-documents`
   - **Public bucket**: ❌ **Uncheck** (make it private)
   - **File size limit**: 10 MB (or your preference)
   - **Allowed MIME types**: `image/*,application/pdf` (optional)
4. Click **"Create bucket"**

### Step 3: Set Up Storage Policies (RLS)

1. Go to **Storage** → **Policies** (or click on your bucket → **Policies**)
2. Create these policies:

#### Policy 1: Drivers can view their own documents

```sql
CREATE POLICY "Drivers can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'driver-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Policy 2: Drivers can upload their own documents

```sql
CREATE POLICY "Drivers can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'driver-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Policy 3: Admins can view all documents

```sql
CREATE POLICY "Admins can view all documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'driver-documents'
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);
```

#### Policy 4: Admins can delete documents

```sql
CREATE POLICY "Admins can delete documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'driver-documents'
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);
```

**Note**: For server-side operations (using service role key), RLS policies don't apply. The service role key bypasses RLS, which is what we need for the backend.

### Step 4: Add Environment Variables

Add to your `.env` file:

```bash
# Supabase Storage
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_STORAGE_BUCKET=driver-documents
```

**Important**: 
- Replace `your-project-id` with your actual Supabase project ID
- Replace `your_service_role_key_here` with your actual service role key
- Keep the service role key **secret** - never commit it to git!

### Step 5: Install Dependencies

```bash
npm install @supabase/supabase-js
```

### Step 6: Test the Setup

1. **Start your server**:
   ```bash
   npm run dev
   ```

2. **Upload a test document** through your app

3. **Check Supabase Storage**:
   - Go to **Storage** → **driver-documents**
   - You should see the uploaded file in `user_{userId}/` folder

### Step 7: Migrate Existing Documents (Optional)

If you have existing documents in local filesystem:

```bash
node migrate-to-supabase-storage.js
```

This will:
- Read all documents from local filesystem
- Upload them to Supabase Storage
- Update database file paths
- Keep local files (you can delete them manually after verification)

---

## How It Works

### Storage Structure

Documents are stored in Supabase Storage with this structure:
```
driver-documents/
  ├── user_1/
  │   ├── licensePhotoFront-1234567890-abc123.pdf
  │   ├── insuranceDocument-1234567891-def456.pdf
  │   └── ...
  ├── user_2/
  │   └── ...
  └── ...
```

### File Path Format

- **Storage Path**: `user_{userId}/{documentType}-{timestamp}-{random}{extension}`
- **Example**: `user_5/licensePhotoFront-1701234567890-abc123def.pdf`

### Access Control

- **Private Bucket**: Documents are not publicly accessible
- **Service Role Key**: Backend uses service role key (bypasses RLS)
- **Signed URLs**: Can generate temporary signed URLs for secure access
- **RLS Policies**: Additional security layer for direct client access

---

## Benefits

✅ **Scalable**: Automatic scaling, no disk space limits  
✅ **Reliable**: Built-in redundancy and backups  
✅ **Fast**: CDN for global delivery  
✅ **Secure**: Built-in access control  
✅ **Cost-Effective**: Included in your Pro plan (100GB)  
✅ **Easy Management**: Web UI for viewing/managing files  

---

## Troubleshooting

### Error: "Bucket not found"
- Make sure bucket name matches `SUPABASE_STORAGE_BUCKET` in `.env`
- Check bucket exists in Supabase Dashboard

### Error: "Invalid API key"
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- Make sure you're using **Service Role Key**, not **anon key**

### Error: "Permission denied"
- Check RLS policies are set up correctly
- Service role key should bypass RLS, so this shouldn't happen for backend operations

### Documents not showing in Supabase Storage
- Check server logs for upload errors
- Verify file paths are correct
- Check bucket name matches

---

## Next Steps

1. ✅ Set up Supabase Storage bucket
2. ✅ Add environment variables
3. ✅ Test document upload
4. ✅ Migrate existing documents (if any)
5. ✅ Verify documents are accessible
6. ✅ (Optional) Delete local files after verification

---

## Security Best Practices

1. **Never commit** `SUPABASE_SERVICE_ROLE_KEY` to git
2. **Use environment variables** for all secrets
3. **Keep bucket private** (uncheck "Public bucket")
4. **Set up RLS policies** for additional security
5. **Use signed URLs** for temporary access if needed
6. **Monitor storage usage** in Supabase Dashboard

---

**Ready to go!** Your documents will now be stored in Supabase Storage. 🚀



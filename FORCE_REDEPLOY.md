# Force Vercel Redeploy

If your image isn't showing after deployment, try these steps:

## Option 1: Trigger Redeploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Navigate to your project
3. Go to **Deployments** tab
4. Click the **"..."** menu on the latest deployment
5. Select **"Redeploy"**
6. Confirm the redeploy

## Option 2: Push Empty Commit (Forces New Build)

```bash
git commit --allow-empty -m "Force redeploy - fix image loading"
git push origin main
```

## Option 3: Check Vercel Build Logs

1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on the latest deployment
3. Check **Build Logs** to see if:
   - The build completed successfully
   - The image file was copied to `dist/public`
   - Any errors occurred

## Option 4: Verify Image Path

Check that the image is accessible at:
```
https://yourdomain.com/app-preview-phone.png
```

If you get a 404, the image wasn't included in the build.

## Option 5: Clear Vercel Cache

1. Go to Vercel Dashboard → Settings → General
2. Scroll to **"Clear Build Cache"**
3. Click **"Clear"**
4. Redeploy

## Troubleshooting

### Image shows locally but not on Vercel:
- ✅ Image is in `client/public/app-preview-phone.png` (correct location)
- ✅ Build outputs to `dist/public/app-preview-phone.png` (verified)
- ✅ Code references `/app-preview-phone.png` (correct path)
- ⚠️ Vercel might need a fresh build

### Check Build Output:
```bash
npm run build
ls -lh dist/public/app-preview-phone.png
```

If the file exists locally after build, Vercel should include it too.


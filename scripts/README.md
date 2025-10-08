# Batch Image Resize Script

This script compresses all existing images in your Supabase storage to under 300KB for WhatsApp compatibility.

## Prerequisites

1. Make sure your environment variables are set up in `.env` file:
   ```
   PLASMO_PUBLIC_SUPABASE_URL=your_supabase_url
   PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. Ensure you have the required dependencies installed:
   ```bash
   npm install
   ```

## Running the Script

To resize all existing images in your Supabase storage:

```bash
npm run resize-images
```

## What the Script Does

1. **Fetches all product images** from the `product_images` table in your database
2. **Downloads each image** from Supabase storage
3. **Checks file size** - skips images already under 300KB
4. **Compresses images** using the same compression settings as the upload process:
   - Maximum size: 300KB
   - Maximum dimensions: 1200x630px
   - Quality: 80%
   - Format: JPEG
5. **Replaces the original** image in Supabase storage with the compressed version
6. **Processes in batches** of 5 images at a time to avoid overwhelming the system
7. **Provides detailed progress** and final statistics

## Output Example

```
🚀 Starting batch image resize process...
📋 Fetching all product images...
📊 Found 25 images to process

🔄 Processing batch 1/5 (5 images)
Processing image: https://your-supabase-url/storage/v1/object/public/products/image1.jpg
Compressing image: 1.2 MB -> target: <300KB
Compressed to: 287 KB (76% reduction)
✅ Successfully processed: https://your-supabase-url/storage/v1/object/public/products/image1.jpg

📊 Batch Resize Results:
========================
✅ Successfully compressed: 20
⏭️ Skipped (already <300KB): 3
❌ Failed: 2
📁 Total images processed: 25
💾 Total size reduction: 15.3 MB -> 4.8 MB (69% reduction)

🎉 Batch resize process completed!
```

## Error Handling

- The script handles network errors gracefully
- Failed images are logged with specific error messages
- Processing continues even if individual images fail
- A summary of all errors is provided at the end

## Safety Features

- **Non-destructive**: Only processes images that are over 300KB
- **Batch processing**: Processes images in small batches with delays
- **Detailed logging**: Shows progress and results for each image
- **Error recovery**: Continues processing even if some images fail

## Troubleshooting

### Common Issues

1. **Environment variables not found**
   - Make sure your `.env` file is in the project root
   - Verify the variable names match exactly

2. **Permission errors**
   - Ensure you're using the service role key, not the anon key
   - Check that your service role has storage permissions

3. **Network timeouts**
   - The script includes retry logic for downloads
   - Large images may take longer to process

4. **Memory issues**
   - The script processes images in batches to manage memory
   - Very large images (>10MB) may cause issues

### Manual Verification

After running the script, you can verify the results by:
1. Checking the file sizes in your Supabase storage dashboard
2. Testing image uploads in your application
3. Verifying WhatsApp compatibility by sharing compressed images

## Technical Details

- Uses the same compression utility as the upload process
- Maintains original file names and paths
- Updates images in-place using Supabase storage `update` method
- Preserves image metadata and public URLs
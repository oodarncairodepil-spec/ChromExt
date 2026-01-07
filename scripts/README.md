# Scripts Directory

This directory contains utility scripts for database maintenance, debugging, and setup operations.

## Directory Structure

```
scripts/
├── README.md (this file)
├── database/          # Database-related scripts (check, fix, debug, create, diagnose)
├── maintenance/       # General maintenance scripts (check, fix, debug, create, diagnose, restore)
├── test/             # Test files (JS, HTML, data files)
│   └── data/         # Test data files (JSON, TXT, XLSX)
├── assets/            # Test assets
│   └── test-images/  # Test images (courier logos, etc.)
└── [other scripts]    # Various utility scripts
```

## Script Categories

### Database Scripts (`database/`)
Scripts for database operations, RLS policies, schema checks, and data integrity:
- `check-*.js` - Database schema and data validation scripts
- `fix-*.js` - Database fixes and migrations
- `debug-*.js` - Database debugging utilities
- `create-*.js` - Database setup and creation scripts
- `diagnose-*.js` - Database diagnostic tools

### Maintenance Scripts (`maintenance/`)
General maintenance and utility scripts:
- `check-*.js` - Validation and checking scripts
- `fix-*.js` - Fix and repair scripts
- `debug-*.js` - Debugging utilities
- `create-*.js` - Setup and creation scripts
- `diagnose-*.js` - Diagnostic tools
- `restore-*.js` - Restore and recovery scripts

## Running Scripts

Most scripts require environment variables to be set. Make sure your `.env` file contains:
```
PLASMO_PUBLIC_SUPABASE_URL=your_supabase_url
PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Then run scripts directly with Node.js:
```bash
node scripts/maintenance/check-images.js
node scripts/database/check-current-rls.js
node scripts/test/test-db.js
```

## Directory Organization

**Note**: The `test-files/` directory has been merged into `scripts/`:
- Test JS/HTML files → `scripts/test/`
- Test data files → `scripts/test/data/`
- Test images → `scripts/assets/test-images/`
- Debug/fix scripts → `scripts/database/` or `scripts/maintenance/`

## Other Scripts

### Image Processing
- `batch-compress-images.js` - Batch compress images in Supabase storage
- `batchResizeImages.ts` - TypeScript version of image resizing
- `nodeImageCompression.js` - Node.js image compression utility

### Database Setup
- `setup-couriers.js` - Setup shipping couriers
- `add-custom-courier.js` - Add custom courier
- `upload-courier-logos.js` - Upload courier logos to storage

### Testing (`test/`)
Test files for development and debugging:
- `test-*.js` - Test scripts (courier, database, environment, logo parsing)
- `test-*.html` - Test HTML files (WhatsApp, CORS, template preview, etc.)
- `test/data/` - Test data files (JSON, TXT, XLSX)
- `debug-*.js` - Debug scripts (moved to `database/` or `maintenance/`)

### Test Assets (`assets/test-images/`)
- Courier logo images for testing
- Other test images

### Testing Utilities
- `test-db.js` (in `test/`) - Database connection testing
- `check_database_data.js` - Database data validation

## Batch Image Resize Script

This script compresses all existing images in your Supabase storage to under 300KB for WhatsApp compatibility.

### Running the Script

```bash
npm run resize-images
```

### What the Script Does

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

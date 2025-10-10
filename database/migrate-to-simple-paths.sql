-- Migration to change logo_data column to store simple image paths
-- This replaces the complex hex-encoded JSON buffer structure with plain text paths

-- Step 1: Check current logo_data structure
SELECT 
    code, 
    name, 
    CASE 
        WHEN logo_data IS NULL THEN 'NULL'
        WHEN logo_data LIKE 'http%' THEN 'URL'
        WHEN LENGTH(logo_data) > 1000 THEN 'HEX_DATA'
        ELSE 'OTHER'
    END as data_type,
    LENGTH(logo_data) as data_length
FROM shipping_couriers 
ORDER BY name;

-- Step 2: Create backup of current logo_data
ALTER TABLE shipping_couriers 
ADD COLUMN IF NOT EXISTS logo_data_backup TEXT;

UPDATE shipping_couriers 
SET logo_data_backup = logo_data 
WHERE logo_data_backup IS NULL;

-- Step 3: Clear existing logo_data to prepare for simple paths
UPDATE shipping_couriers 
SET logo_data = NULL;

-- Step 4: Set simple image paths for known couriers
-- These paths point to the courier-logos storage bucket
UPDATE shipping_couriers 
SET logo_data = 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/anteraja-logo.png'
WHERE code = 'anteraja';

UPDATE shipping_couriers 
SET logo_data = 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/jne-logo.png'
WHERE code = 'jne';

UPDATE shipping_couriers 
SET logo_data = 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/jnt-logo.png'
WHERE code = 'jnt';

UPDATE shipping_couriers 
SET logo_data = 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/sicepat-logo.png'
WHERE code = 'sicepat';

UPDATE shipping_couriers 
SET logo_data = 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/tiki-logo.png'
WHERE code = 'tiki';

UPDATE shipping_couriers 
SET logo_data = 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/pos-logo.png'
WHERE code = 'pos';

UPDATE shipping_couriers 
SET logo_data = 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/lion-logo.png'
WHERE code = 'lion';

UPDATE shipping_couriers 
SET logo_data = 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/ninja-logo.png'
WHERE code = 'ninja';

UPDATE shipping_couriers 
SET logo_data = 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/wahana-logo.png'
WHERE code = 'wahana';

UPDATE shipping_couriers 
SET logo_data = 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/sap-logo.png'
WHERE code = 'sap';

UPDATE shipping_couriers 
SET logo_data = 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/gosend-logo.png'
WHERE code = 'gosend';

UPDATE shipping_couriers 
SET logo_data = 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/grab-logo.png'
WHERE code = 'grab';

UPDATE shipping_couriers 
SET logo_data = 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/paxel-logo.png'
WHERE code = 'paxel';

UPDATE shipping_couriers 
SET logo_data = 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/id-express-logo.png'
WHERE code = 'id_express';

-- Step 5: Update column comment to reflect new structure
COMMENT ON COLUMN shipping_couriers.logo_data IS 'Simple image path or URL for courier logo';

-- Step 6: Verify the migration
SELECT 
    code, 
    name, 
    logo_data,
    CASE 
        WHEN logo_data IS NULL THEN '❌ No logo'
        WHEN logo_data LIKE 'http%' THEN '✅ URL'
        ELSE '⚠️ Other'
    END as status
FROM shipping_couriers 
ORDER BY name;

-- Step 7: Show migration summary
SELECT 
    COUNT(*) as total_couriers,
    COUNT(logo_data) as couriers_with_logos,
    COUNT(*) - COUNT(logo_data) as couriers_without_logos
FROM shipping_couriers;

SELECT '✅ Migration to simple image paths completed successfully!' as result;
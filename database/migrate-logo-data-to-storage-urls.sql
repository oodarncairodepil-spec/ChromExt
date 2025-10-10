-- Migration script to update logo_data column to reference existing Supabase storage URLs
-- The logo images are already available in the 'courier-logos' storage bucket

-- First, let's check current data types and content
SELECT 
    code, 
    name,
    pg_typeof(logo_data) as current_type,
    CASE 
        WHEN logo_data IS NOT NULL THEN 'Has data'
        ELSE 'No data'
    END as data_status
FROM shipping_couriers 
ORDER BY name;

-- Create a backup column to preserve existing data during migration
ALTER TABLE shipping_couriers 
ADD COLUMN IF NOT EXISTS logo_data_backup TEXT;

-- Copy existing data to backup (if not already backed up)
UPDATE shipping_couriers 
SET logo_data_backup = logo_data 
WHERE logo_data IS NOT NULL AND logo_data_backup IS NULL;

-- Update logo_data to reference storage URLs for couriers that have logos in storage
-- Replace with actual Supabase storage URLs for each courier
UPDATE shipping_couriers 
SET logo_data = 'https://your-supabase-url.supabase.co/storage/v1/object/public/courier-logos/' || code || '-logo.png'
WHERE code IN (
    'anteraja', 'gosend', 'grab', 'id_express', 'jne', 
    'lion', 'ninja', 'paxel', 'pos', 'sap', 'tiki', 'wahana'
) AND (logo_data IS NULL OR logo_data NOT LIKE 'http%');

-- Alternative: Set specific URLs if you know the exact file names
-- UPDATE shipping_couriers SET logo_data = 'https://your-supabase-url.supabase.co/storage/v1/object/public/courier-logos/anteraja-logo.png' WHERE code = 'anteraja';
-- UPDATE shipping_couriers SET logo_data = 'https://your-supabase-url.supabase.co/storage/v1/object/public/courier-logos/gosend-logo.png' WHERE code = 'gosend';
-- Add more specific URLs as needed...

-- Update comment to reflect new purpose
COMMENT ON COLUMN shipping_couriers.logo_data IS 'Storage URL for courier logo image in courier-logos bucket';

-- Show migration results
SELECT 
    code,
    name,
    CASE 
        WHEN logo_data LIKE 'http%' THEN 'Migrated: ' || left(logo_data, 60) || '...'
        WHEN logo_data IS NOT NULL THEN 'Has data but not URL: ' || left(logo_data, 30) || '...'
        ELSE 'No logo data'
    END as migration_status
FROM shipping_couriers 
ORDER BY name;

-- Verify final schema
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'shipping_couriers' AND column_name = 'logo_data';

-- Migration completed message
SELECT 'Migration completed. logo_data column now references Supabase storage URLs.' AS migration_status;
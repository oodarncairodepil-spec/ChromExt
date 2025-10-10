-- Migration script to change logo_data column from BYTEA to TEXT
-- and migrate existing hex-encoded data to proper storage paths

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
ADD COLUMN logo_data_backup BYTEA;

-- Copy existing data to backup
UPDATE shipping_couriers 
SET logo_data_backup = logo_data 
WHERE logo_data IS NOT NULL;

-- Drop the existing logo_data column
ALTER TABLE shipping_couriers 
DROP COLUMN logo_data;

-- Add new logo_data column as TEXT to store storage paths
ALTER TABLE shipping_couriers 
ADD COLUMN logo_data TEXT;

-- Update comment to reflect new purpose
COMMENT ON COLUMN shipping_couriers.logo_data IS 'Storage path or URL for courier logo image in courier-logos bucket';

-- Function to decode hex-encoded URLs from legacy data
CREATE OR REPLACE FUNCTION decode_hex_logo_data(hex_data BYTEA)
RETURNS TEXT AS $$
DECLARE
    decoded_text TEXT;
    hex_string TEXT;
BEGIN
    -- Convert bytea to hex string
    hex_string := encode(hex_data, 'hex');
    
    -- Convert hex pairs to characters
    decoded_text := '';
    FOR i IN 1..length(hex_string) BY 2 LOOP
        decoded_text := decoded_text || chr(('x' || substr(hex_string, i, 2))::int);
    END LOOP;
    
    -- Check if decoded text is a URL
    IF decoded_text LIKE 'http%' THEN
        RETURN decoded_text;
    END IF;
    
    -- If not a direct URL, return NULL (will need manual handling)
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Migrate existing hex-encoded data to text URLs
UPDATE shipping_couriers 
SET logo_data = decode_hex_logo_data(logo_data_backup)
WHERE logo_data_backup IS NOT NULL;

-- Show migration results
SELECT 
    code,
    name,
    CASE 
        WHEN logo_data IS NOT NULL THEN 'Migrated: ' || left(logo_data, 50) || '...'
        WHEN logo_data_backup IS NOT NULL THEN 'Failed to migrate (manual intervention needed)'
        ELSE 'No logo data'
    END as migration_status
FROM shipping_couriers 
ORDER BY name;

-- Clean up: Drop backup column after successful migration
-- Uncomment the following line after verifying migration results:
-- ALTER TABLE shipping_couriers DROP COLUMN logo_data_backup;

-- Drop the helper function
DROP FUNCTION IF EXISTS decode_hex_logo_data(BYTEA);

-- Verify final schema
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'shipping_couriers' AND column_name = 'logo_data';

-- Migration completed. logo_data column is now TEXT type and can store storage paths or URLs.
SELECT 'Migration completed. logo_data column is now TEXT type and can store storage paths or URLs.' AS migration_status;
-- Add logo column to shipping_couriers table
-- This script adds a bytea column to store courier logo images as binary data

ALTER TABLE shipping_couriers 
ADD COLUMN logo_data BYTEA;

-- Add comment to document the column purpose
COMMENT ON COLUMN shipping_couriers.logo_data IS 'Binary data of courier logo image';

-- Note: Logo images will be uploaded programmatically using a Node.js script
-- that reads the image files and inserts them as binary data

-- Verify the column was added successfully
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'shipping_couriers' AND column_name = 'logo_data';

-- Show updated courier data (logo_data will show as binary)
SELECT code, name, 
       CASE WHEN logo_data IS NOT NULL THEN 'Logo uploaded' ELSE 'No logo' END as logo_status
FROM shipping_couriers ORDER BY name;
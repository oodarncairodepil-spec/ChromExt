-- Fix shipping_couriers.logo_data column type from bytea to text
-- This will allow storing plain URLs instead of hex-encoded data

-- Step 1: Check current column type
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'shipping_couriers' 
  AND column_name = 'logo_data';

-- Step 2: Create backup of current data (optional)
-- ALTER TABLE shipping_couriers ADD COLUMN logo_data_backup bytea;
-- UPDATE shipping_couriers SET logo_data_backup = logo_data;

-- Step 3: Change column type from bytea to text
-- This will automatically convert existing bytea data to text representation
ALTER TABLE shipping_couriers 
ALTER COLUMN logo_data TYPE text;

-- Step 4: Update column comment
COMMENT ON COLUMN shipping_couriers.logo_data IS 'Courier logo image URL or path';

-- Step 5: Verify the change
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'shipping_couriers' 
  AND column_name = 'logo_data';

-- Step 6: Check sample data after type change
SELECT 
    code,
    name,
    logo_data,
    length(logo_data) as data_length,
    left(logo_data, 100) as first_100_chars
FROM shipping_couriers 
WHERE logo_data IS NOT NULL
ORDER BY code
LIMIT 5;
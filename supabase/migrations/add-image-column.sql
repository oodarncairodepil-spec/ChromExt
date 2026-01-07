-- Add image column to products table
ALTER TABLE products ADD COLUMN image TEXT;

-- Optional: Add comment to describe the column
COMMENT ON COLUMN products.image IS 'URL of the product image stored in Supabase storage';

-- Instructions:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Run this SQL command to add the image column to the products table
-- 4. After running this, the image upload and display functionality will work correctly
-- Add has_variants column to existing products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT false;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_products_has_variants ON products(has_variants);

-- Instructions:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Run this SQL command to add the has_variants column to your existing products table
-- 4. After this, you can run the setup-product-variants.sql script successfully
-- Add sku column to existing products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(100) UNIQUE;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- Instructions:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Run this SQL command to add the sku column to your existing products table
-- 4. After this, you can run the setup-product-variants.sql script successfully
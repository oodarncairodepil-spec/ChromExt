-- Add name column to existing products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS name VARCHAR(255) NOT NULL DEFAULT 'Unnamed Product';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- Instructions:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Run this SQL command to add the name column to your existing products table
-- 4. After this, you can run setup-product-variants.sql successfully
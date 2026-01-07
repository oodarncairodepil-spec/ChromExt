-- Add notes functionality to the database
-- This script adds the required columns for the notes feature

-- 1. Add order_notes column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_notes TEXT;

-- 2. Add has_notes column to products table to enable/disable product notes
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_notes BOOLEAN DEFAULT false;

-- 3. Add notes column to cart_items table to store individual item notes
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_has_notes ON products(has_notes);
CREATE INDEX IF NOT EXISTS idx_cart_items_notes ON cart_items(notes) WHERE notes IS NOT NULL;

-- Update RLS policies if needed (they should already allow these columns)
-- The existing policies should cover the new columns automatically

COMMIT;
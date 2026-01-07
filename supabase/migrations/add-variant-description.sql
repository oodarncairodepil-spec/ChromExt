-- Add description column to product_variants table
-- This allows each variant to have its own description
ALTER TABLE product_variants 
ADD COLUMN IF NOT EXISTS description TEXT;


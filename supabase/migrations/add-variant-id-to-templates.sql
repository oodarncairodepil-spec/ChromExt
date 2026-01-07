-- Add variant_id column to quick_reply_templates table
-- This allows each product variant to have its own quick reply template
-- Execute this in Supabase SQL Editor

-- =============================================================================
-- ADD VARIANT_ID TO QUICK_REPLY_TEMPLATES
-- =============================================================================

-- Add variant_id column to quick_reply_templates table
-- This column is nullable because templates can be:
-- 1. General templates (no product_id, no variant_id)
-- 2. Product-level templates (has product_id, no variant_id)
-- 3. Variant-level templates (has product_id, has variant_id)
ALTER TABLE quick_reply_templates
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE;

-- Create index for better query performance when filtering by variant_id
CREATE INDEX IF NOT EXISTS idx_quick_reply_templates_variant_id 
ON quick_reply_templates(variant_id);

-- Add a check constraint to ensure data integrity:
-- If variant_id is set, product_id should also be set (variant belongs to a product)
-- This ensures that variant-level templates are always linked to a product
ALTER TABLE quick_reply_templates
DROP CONSTRAINT IF EXISTS check_variant_requires_product;

ALTER TABLE quick_reply_templates
ADD CONSTRAINT check_variant_requires_product 
CHECK (
  variant_id IS NULL OR product_id IS NOT NULL
);

-- Update the existing index on product_id to include variant_id for composite queries
-- (This is optional but can improve performance for queries filtering by both product_id and variant_id)
-- Note: PostgreSQL will use both indexes if needed, so we don't need to create a composite index unless
-- we frequently query by both columns together.

-- Instructions:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Run this SQL script
-- 4. This will add the variant_id column to quick_reply_templates table
-- 5. After running, you can link templates to specific product variants


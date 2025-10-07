-- Fix product_images RLS policies to resolve upload errors
-- This script drops existing policies and recreates them properly

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view product images" ON product_images;
DROP POLICY IF EXISTS "Users can insert their own product images" ON product_images;
DROP POLICY IF EXISTS "Users can update their own product images" ON product_images;
DROP POLICY IF EXISTS "Users can delete their own product images" ON product_images;

-- Recreate policies with proper permissions
CREATE POLICY "Users can view product images" ON product_images
FOR SELECT USING (true);

CREATE POLICY "Users can insert their own product images" ON product_images
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_images.product_id 
    AND products.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own product images" ON product_images
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_images.product_id 
    AND products.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_images.product_id 
    AND products.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own product images" ON product_images
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_images.product_id 
    AND products.user_id = auth.uid()
  )
);

-- Instructions:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Run this SQL command to fix the product_images RLS policies
-- 4. This should resolve the "new row violates row-level security policy" error
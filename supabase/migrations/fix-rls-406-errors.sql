-- Fix RLS policies causing 406 errors for product_images and user_profiles tables
-- This script addresses the specific 406 HTTP errors seen in the application

-- =============================================================================
-- 1. FIX PRODUCT_IMAGES TABLE RLS POLICIES
-- =============================================================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view product images" ON product_images;
DROP POLICY IF EXISTS "Users can insert their own product images" ON product_images;
DROP POLICY IF EXISTS "Users can update their own product images" ON product_images;
DROP POLICY IF EXISTS "Users can delete their own product images" ON product_images;

-- Recreate policies with proper permissions
-- Allow all authenticated users to view product images (public read access)
CREATE POLICY "Users can view product images" ON product_images
FOR SELECT USING (true);

-- Only allow users to insert images for their own products
CREATE POLICY "Users can insert their own product images" ON product_images
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_images.product_id 
    AND products.user_id = auth.uid()
  )
);

-- Only allow users to update images for their own products
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

-- Only allow users to delete images for their own products
CREATE POLICY "Users can delete their own product images" ON product_images
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_images.product_id 
    AND products.user_id = auth.uid()
  )
);

-- =============================================================================
-- 2. FIX USER_PROFILES TABLE RLS POLICIES
-- =============================================================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON user_profiles;

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile" ON user_profiles
FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile" ON user_profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON user_profiles
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own profile
CREATE POLICY "Users can delete their own profile" ON user_profiles
FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- 3. ENSURE RLS IS ENABLED ON BOTH TABLES
-- =============================================================================

-- Enable RLS on product_images table
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Enable RLS on user_profiles table
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 4. VERIFICATION
-- =============================================================================

-- Test queries to verify policies work (these should not return errors)
-- SELECT COUNT(*) FROM product_images; -- Should work for authenticated users
-- SELECT COUNT(*) FROM user_profiles WHERE user_id = auth.uid(); -- Should work for own profile

SELECT 'RLS policies fixed for product_images and user_profiles tables!' as status;

-- Instructions:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Run this SQL script to fix the 406 RLS errors
-- 4. Test the application to verify images load correctly
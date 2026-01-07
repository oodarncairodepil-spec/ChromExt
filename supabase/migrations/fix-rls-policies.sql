-- Fix Row Level Security (RLS) policies to ensure proper data isolation
-- This script addresses the security issue where users can see other users' data

-- =============================================================================
-- 1. FIX PRODUCTS TABLE RLS POLICIES
-- =============================================================================

-- Drop the overly permissive policy that allows viewing all products
DROP POLICY IF EXISTS "Users can view all products" ON products;

-- Create proper policy that only allows users to see their own products
CREATE POLICY "Users can view their own products" ON products
  FOR SELECT USING (user_id = auth.uid());

-- The existing "Users can manage their own products" policy is already correct
-- It uses: FOR ALL USING (user_id = auth.uid())

-- =============================================================================
-- 2. FIX USERS TABLE RLS POLICIES
-- =============================================================================

-- Drop the overly permissive policy that allows all operations on all users
DROP POLICY IF EXISTS "Allow all operations on users" ON users;

-- Create proper policies for users table
-- Note: The users table stores customer/buyer data, so sellers should only see
-- users who have interacted with them (through orders)

-- Allow users to view users who have placed orders with them
CREATE POLICY "Sellers can view their customers" ON users
  FOR SELECT USING (
    id IN (
      SELECT DISTINCT buyer_id 
      FROM orders 
      WHERE seller_id = auth.uid() 
      AND buyer_id IS NOT NULL
    )
  );

-- Allow users to insert new customers (for order creation)
CREATE POLICY "Sellers can create customers" ON users
  FOR INSERT WITH CHECK (true);

-- Allow users to update customers who have ordered from them
CREATE POLICY "Sellers can update their customers" ON users
  FOR UPDATE USING (
    id IN (
      SELECT DISTINCT buyer_id 
      FROM orders 
      WHERE seller_id = auth.uid() 
      AND buyer_id IS NOT NULL
    )
  );

-- =============================================================================
-- 3. VERIFY TEMPLATES TABLE RLS POLICIES
-- =============================================================================

-- The templates (quick_reply_templates) table already has correct RLS policies:
-- - "Users can view their own templates" FOR SELECT USING (auth.uid() = user_id)
-- - "Users can insert their own templates" FOR INSERT WITH CHECK (auth.uid() = user_id)
-- - "Users can update their own templates" FOR UPDATE USING (auth.uid() = user_id)
-- - "Users can delete their own templates" FOR DELETE USING (auth.uid() = user_id)

-- =============================================================================
-- 4. FIX ORDERS TABLE RLS POLICIES
-- =============================================================================

-- Drop the overly permissive policy that allows all operations on all orders
DROP POLICY IF EXISTS "Allow all operations on orders" ON orders;

-- Create proper policies for orders table
CREATE POLICY "Users can view their own orders" ON orders
  FOR SELECT USING (seller_id = auth.uid());

CREATE POLICY "Users can create their own orders" ON orders
  FOR INSERT WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Users can update their own orders" ON orders
  FOR UPDATE USING (seller_id = auth.uid());

CREATE POLICY "Users can delete their own orders" ON orders
  FOR DELETE USING (seller_id = auth.uid());

-- =============================================================================
-- 5. VERIFY OTHER TABLES HAVE PROPER RLS
-- =============================================================================

-- user_profiles: Already has correct RLS (users can only access their own profile)
-- payment_methods: Already has correct RLS (users can only access their own payment methods)
-- cart_items: Already has correct RLS (users can only access their own cart items)
-- product_variants: Already has correct RLS (users can only access variants of their own products)
-- variant_options: Already has correct RLS (users can only access options of their own products)
-- product_images: Already has correct RLS (users can only manage images of their own products)

-- =============================================================================
-- SUMMARY
-- =============================================================================

-- This script fixes the following security issues:
-- 1. Products table: Changed from allowing all users to view all products to only own products
-- 2. Users table: Changed from allowing all operations to only allowing access to customers who have ordered
-- 3. Orders table: Changed from allowing all operations to only allowing access to own orders
-- 4. Templates table: Already had proper RLS policies
-- 5. Other tables: Already had proper RLS policies

SELECT 'RLS policies have been fixed for proper data isolation!' as status;
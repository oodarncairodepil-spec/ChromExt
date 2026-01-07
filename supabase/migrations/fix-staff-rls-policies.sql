-- Fix RLS policies to allow staff accounts to view owner's data
-- This migration updates policies for products, orders, and templates tables

-- =============================================================================
-- 1. FIX PRODUCTS TABLE RLS POLICIES FOR STAFF
-- =============================================================================

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own products" ON products;
DROP POLICY IF EXISTS "Users can only see own products" ON products;
DROP POLICY IF EXISTS "products_select_owner" ON products;
DROP POLICY IF EXISTS "Users and staff can view products" ON products;

-- Create new policy that allows:
-- 1. Users to see their own products (user_id = auth.uid())
-- 2. Staff to see their owner's products (user_id = owner_id from staff_accounts)
CREATE POLICY "Users and staff can view products" ON products
  FOR SELECT USING (
    user_id = auth.uid() OR
    user_id IN (
      SELECT owner_id 
      FROM staff_accounts 
      WHERE staff_user_id = auth.uid() 
      AND is_active = true
    )
  );

-- =============================================================================
-- 2. FIX ORDERS TABLE RLS POLICIES FOR STAFF
-- =============================================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can only see own orders" ON orders;
DROP POLICY IF EXISTS "Sellers can view their orders" ON orders;
DROP POLICY IF EXISTS "Sellers and staff can view orders" ON orders;

-- Create new policy that allows:
-- 1. Sellers to see their own orders (seller_id = auth.uid())
-- 2. Staff to see their owner's orders (seller_id = owner_id from staff_accounts)
-- Note: The application-level filtering by created_by for staff without can_view_all_orders
-- is handled in the application code, not in RLS
CREATE POLICY "Sellers and staff can view orders" ON orders
  FOR SELECT USING (
    seller_id = auth.uid() OR
    seller_id IN (
      SELECT owner_id 
      FROM staff_accounts 
      WHERE staff_user_id = auth.uid() 
      AND is_active = true
    )
  );

-- =============================================================================
-- 3. FIX QUICK_REPLY_TEMPLATES TABLE RLS POLICIES FOR STAFF
-- =============================================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own templates" ON quick_reply_templates;
DROP POLICY IF EXISTS "quick_reply_templates_select_owner" ON quick_reply_templates;
DROP POLICY IF EXISTS "Users and staff can view templates" ON quick_reply_templates;

-- Create new policy that allows:
-- 1. Users to see their own templates (user_id = auth.uid())
-- 2. Staff to see their owner's templates (user_id = owner_id from staff_accounts)
CREATE POLICY "Users and staff can view templates" ON quick_reply_templates
  FOR SELECT USING (
    user_id = auth.uid() OR
    user_id IN (
      SELECT owner_id 
      FROM staff_accounts 
      WHERE staff_user_id = auth.uid() 
      AND is_active = true
    )
  );

-- =============================================================================
-- 4. FIX USERS TABLE RLS POLICIES FOR STAFF
-- =============================================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can only see own profile" ON users;
DROP POLICY IF EXISTS "Sellers can view their customers" ON users;
DROP POLICY IF EXISTS "Users can only see own users" ON users;

-- Create new policy that allows:
-- 1. Users to see their own customers (user_id = auth.uid())
-- 2. Staff to see their owner's customers (user_id = owner_id from staff_accounts)
-- Note: The users table stores customer/buyer data, so sellers should see
-- users who belong to them (user_id = seller_id)
CREATE POLICY "Sellers and staff can view customers" ON users
  FOR SELECT USING (
    user_id = auth.uid() OR
    user_id IN (
      SELECT owner_id 
      FROM staff_accounts 
      WHERE staff_user_id = auth.uid() 
      AND is_active = true
    )
  );

-- =============================================================================
-- NOTES:
-- =============================================================================
-- 1. These policies allow staff to VIEW owner's data, but staff still cannot
--    INSERT, UPDATE, or DELETE owner's data unless they have explicit permissions
--    (handled by application-level permission checks)
-- 2. The existing INSERT/UPDATE/DELETE policies remain unchanged and still
--    restrict operations to the owner only (user_id = auth.uid())
-- 3. For orders, the application code handles filtering by created_by for staff
--    without can_view_all_orders permission
-- 4. For users (customers), staff can view and create customers for their owner
-- =============================================================================


-- Fix RLS policy for users table to allow staff accounts to view owner's customers
-- This migration is idempotent and can be run multiple times safely

-- =============================================================================
-- FIX USERS TABLE RLS POLICIES FOR STAFF
-- =============================================================================

-- Drop existing restrictive policies (if they exist)
DROP POLICY IF EXISTS "Users can only see own profile" ON users;
DROP POLICY IF EXISTS "Sellers can view their customers" ON users;
DROP POLICY IF EXISTS "Users can only see own users" ON users;
DROP POLICY IF EXISTS "Sellers and staff can view customers" ON users;

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
-- This policy allows staff to VIEW owner's customers, but staff still cannot
-- INSERT, UPDATE, or DELETE owner's customers unless they have explicit permissions
-- (handled by application-level permission checks)
-- The existing INSERT/UPDATE/DELETE policies remain unchanged and still
-- restrict operations to the owner only (user_id = auth.uid())
-- =============================================================================


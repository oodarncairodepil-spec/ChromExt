-- Simple test to verify products table accessibility and columns
-- Run this in Supabase SQL Editor to test table access

-- Test 1: Check if we can select from products table
SELECT COUNT(*) as total_products FROM products;

-- Test 2: Try to select specific columns that the variant system needs
SELECT 
    id,
    name,
    sku,
    user_id
FROM products 
LIMIT 1;

-- Test 3: Test the function that's causing issues
SELECT 
    id,
    name
FROM products 
WHERE id IS NOT NULL
LIMIT 1;

-- Instructions:
-- 1. Run this test script first
-- 2. If this works, then the issue might be with the trigger context
-- 3. If this fails, we need to investigate further
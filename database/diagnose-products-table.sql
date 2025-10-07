-- Diagnostic script to check the actual structure of the products table
-- Run this in Supabase SQL Editor to see what columns actually exist

-- Check if products table exists and show its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Also check table constraints
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    ccu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'products' 
    AND tc.table_schema = 'public';

-- Check indexes on products table
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'products' 
    AND schemaname = 'public';

-- Instructions:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Run this diagnostic script
-- 4. Share the results to identify what's missing from the products table
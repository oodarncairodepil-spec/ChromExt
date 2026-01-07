-- Check the current structure of the carts table
-- Run this in Supabase SQL Editor to see what columns exist

-- Check if carts table exists and show its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'carts' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Also check if the table exists at all
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'carts' 
    AND table_schema = 'public'
) AS table_exists;

-- Check table constraints
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    ccu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'carts' 
    AND tc.table_schema = 'public';

-- Instructions:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Run this script to see the current carts table structure
-- 4. Share the results so we can fix the setup-carts.sql script
-- Check actual database schema for variant tables
-- This will help us understand the real column structure

-- Check if variant_options table exists and its columns
SELECT 
    'variant_options' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'variant_options' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if product_variants table exists and its columns
SELECT 
    'product_variants' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'product_variants' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if tables exist at all
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('variant_options', 'product_variants');

-- Sample data from variant_options if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'variant_options' AND table_schema = 'public') THEN
        RAISE NOTICE 'variant_options table exists, checking sample data...';
        -- This will show us what columns actually exist
        PERFORM * FROM variant_options LIMIT 1;
    ELSE
        RAISE NOTICE 'variant_options table does not exist';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error accessing variant_options: %', SQLERRM;
END $$;

-- Sample data from product_variants if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_variants' AND table_schema = 'public') THEN
        RAISE NOTICE 'product_variants table exists, checking sample data...';
        -- This will show us what columns actually exist
        PERFORM * FROM product_variants LIMIT 1;
    ELSE
        RAISE NOTICE 'product_variants table does not exist';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error accessing product_variants: %', SQLERRM;
END $$;
-- Check the actual structure of existing tables to identify the schema mismatch

-- Check if product_variants table exists and its structure
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

-- Check if variant_options table exists and its structure
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

-- Check products table structure to confirm sku column exists there
SELECT 
    'products' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
AND table_schema = 'public'
AND column_name IN ('sku', 'name', 'id', 'user_id')
ORDER BY ordinal_position;
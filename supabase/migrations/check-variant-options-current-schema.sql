-- Check current variant_options table schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'variant_options' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Also check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'variant_options' 
AND table_schema = 'public';

-- Show sample data if any exists
SELECT * FROM variant_options LIMIT 5;
-- Debug script to check existing SKUs and identify duplicate issues

-- 1. Check all existing SKUs in products table
SELECT 
  id,
  name,
  sku,
  user_id,
  created_at
FROM products 
ORDER BY created_at DESC
LIMIT 20;

-- 2. Check for duplicate SKUs
SELECT 
  sku,
  COUNT(*) as count,
  array_agg(id) as product_ids,
  array_agg(name) as product_names
FROM products 
WHERE sku IS NOT NULL
GROUP BY sku
HAVING COUNT(*) > 1;

-- 3. Check products table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name = 'sku';

-- 4. Check unique constraints on products table
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'products'
AND tc.constraint_type = 'UNIQUE';
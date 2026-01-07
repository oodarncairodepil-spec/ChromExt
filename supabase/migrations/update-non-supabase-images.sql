-- SQL query to find and update product images that are not using Supabase domain
-- This will replace all non-Supabase image URLs with the specified Supabase URL

-- First, let's see which products have non-Supabase image URLs
SELECT 
    id,
    name,
    image,
    CASE 
        WHEN image LIKE '%supabase.co%' THEN 'Supabase URL'
        ELSE 'Non-Supabase URL'
    END as url_type
FROM products 
WHERE image IS NOT NULL 
    AND image NOT LIKE '%supabase.co%';

-- Update all products with non-Supabase image URLs
UPDATE products 
SET image = 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/products/7c1fc781-5267-4021-99e6-a2408d7dcd41/1760509380753-dveq9ed21m5.jpg'
WHERE image IS NOT NULL 
    AND image NOT LIKE '%supabase.co%';

-- Verify the update by checking the count of updated records
SELECT 
    COUNT(*) as total_products,
    SUM(CASE WHEN image LIKE '%supabase.co%' THEN 1 ELSE 0 END) as supabase_images,
    SUM(CASE WHEN image NOT LIKE '%supabase.co%' THEN 1 ELSE 0 END) as non_supabase_images
FROM products 
WHERE image IS NOT NULL;
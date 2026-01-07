-- Restore the 'image' column to the products table
-- Run this SQL in your Supabase SQL Editor

-- Add the image column back to the products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS image TEXT;

-- Add a comment to describe the column
COMMENT ON COLUMN products.image IS 'URL of the product image';

-- Optional: Migrate primary images from product_images table back to products.image
-- This will copy the primary image URL from product_images to the products.image column
UPDATE products 
SET image = (
  SELECT image_url 
  FROM product_images 
  WHERE product_images.product_id = products.id 
    AND product_images.is_primary = true 
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 
  FROM product_images 
  WHERE product_images.product_id = products.id 
    AND product_images.is_primary = true
);

-- Verify the results
SELECT 
  p.id,
  p.name,
  p.image as products_image,
  pi.image_url as primary_image_url,
  pi.is_primary
FROM products p
LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
ORDER BY p.created_at DESC
LIMIT 10;
-- Create product_images table to store multiple images per product
CREATE TABLE IF NOT EXISTS product_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_primary ON product_images(product_id, is_primary);

-- Enable RLS (Row Level Security)
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Create policies for product_images
CREATE POLICY "Users can view product images" ON product_images
FOR SELECT USING (true);

CREATE POLICY "Users can insert their own product images" ON product_images
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_images.product_id 
    AND products.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own product images" ON product_images
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_images.product_id 
    AND products.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_images.product_id 
    AND products.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own product images" ON product_images
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_images.product_id 
    AND products.user_id = auth.uid()
  )
);

-- Function to automatically set is_primary to false for other images when a new primary is set
CREATE OR REPLACE FUNCTION update_primary_image()
RETURNS TRIGGER AS $$
BEGIN
  -- If the new/updated record is set as primary
  IF NEW.is_primary = true THEN
    -- Set all other images for this product to not primary
    UPDATE product_images 
    SET is_primary = false 
    WHERE product_id = NEW.product_id 
    AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure only one primary image per product
CREATE TRIGGER trigger_update_primary_image
  BEFORE INSERT OR UPDATE ON product_images
  FOR EACH ROW
  EXECUTE FUNCTION update_primary_image();

-- Migrate existing product images from products.image to product_images table
INSERT INTO product_images (product_id, image_url, is_primary)
SELECT id, image, true
FROM products 
WHERE image IS NOT NULL AND image != ''
ON CONFLICT DO NOTHING;

-- Instructions:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Run this SQL command to create the product_images table and migrate existing data
-- 4. This will enable the preview functionality to work correctly
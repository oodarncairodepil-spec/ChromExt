-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('shop-logos', 'shop-logos', true),
  ('products', 'products', true),
  ('quick-reply-images', 'quick-reply-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own shop logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view shop logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own shop logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own shop logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload template images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view template images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update template images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete template images" ON storage.objects;

-- Create storage policies for shop logos
CREATE POLICY "Users can upload their own shop logos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'shop-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view shop logos" ON storage.objects
FOR SELECT USING (bucket_id = 'shop-logos');

CREATE POLICY "Users can update their own shop logos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'shop-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
) WITH CHECK (
  bucket_id = 'shop-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own shop logos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'shop-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create storage policies for products
CREATE POLICY "Users can upload product images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'products');

CREATE POLICY "Anyone can view product images" ON storage.objects
FOR SELECT USING (bucket_id = 'products');

CREATE POLICY "Users can update product images" ON storage.objects
FOR UPDATE USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

CREATE POLICY "Users can delete product images" ON storage.objects
FOR DELETE USING (bucket_id = 'products');

-- Create storage policies for quick-reply-images
CREATE POLICY "Users can upload template images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'quick-reply-images');

CREATE POLICY "Anyone can view template images" ON storage.objects
FOR SELECT USING (bucket_id = 'quick-reply-images');

CREATE POLICY "Users can update template images" ON storage.objects
FOR UPDATE USING (bucket_id = 'quick-reply-images')
WITH CHECK (bucket_id = 'quick-reply-images');

CREATE POLICY "Users can delete template images" ON storage.objects
FOR DELETE USING (bucket_id = 'quick-reply-images');
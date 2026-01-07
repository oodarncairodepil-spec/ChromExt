-- Create storage policies for courier-logos bucket
-- This allows users to upload and manage courier logos

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload courier logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view courier logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update courier logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete courier logos" ON storage.objects;

-- Create storage policies for courier logos
CREATE POLICY "Users can upload courier logos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'courier-logos');

CREATE POLICY "Anyone can view courier logos" ON storage.objects
FOR SELECT USING (bucket_id = 'courier-logos');

CREATE POLICY "Users can update courier logos" ON storage.objects
FOR UPDATE USING (bucket_id = 'courier-logos')
WITH CHECK (bucket_id = 'courier-logos');

CREATE POLICY "Users can delete courier logos" ON storage.objects
FOR DELETE USING (bucket_id = 'courier-logos');
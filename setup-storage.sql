-- Create storage bucket for shop logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-logos', 'shop-logos', true)
ON CONFLICT (id) DO NOTHING;

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
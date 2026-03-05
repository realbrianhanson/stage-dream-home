
-- Create public storage bucket for staging images
INSERT INTO storage.buckets (id, name, public)
VALUES ('stagings', 'stagings', true);

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'stagings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Public read access (URLs are unguessable with UUID paths)
CREATE POLICY "Public read access for stagings"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'stagings');

-- Users can delete their own files
CREATE POLICY "Users can delete own staging files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'stagings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

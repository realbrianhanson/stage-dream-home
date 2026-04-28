-- Add share token column
ALTER TABLE public.stagings
  ADD COLUMN IF NOT EXISTS share_token text UNIQUE;

-- Allow updates so owners can toggle sharing on/off
CREATE POLICY "Users can update own stagings"
  ON public.stagings
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow anyone (including anon) to view a staging by its share token
CREATE POLICY "Public can view shared stagings"
  ON public.stagings
  FOR SELECT
  TO anon, authenticated
  USING (share_token IS NOT NULL);

-- Helpful index for share lookups
CREATE INDEX IF NOT EXISTS stagings_share_token_idx
  ON public.stagings (share_token)
  WHERE share_token IS NOT NULL;
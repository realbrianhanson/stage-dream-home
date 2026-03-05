CREATE TABLE public.stagings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  original_image_url TEXT NOT NULL,
  staged_image_url TEXT NOT NULL,
  room_type TEXT NOT NULL,
  style TEXT NOT NULL,
  property_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stagings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stagings"
  ON public.stagings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own stagings"
  ON public.stagings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own stagings"
  ON public.stagings FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
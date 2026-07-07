-- 1) agent_profiles
CREATE TABLE public.agent_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  brokerage text,
  phone text,
  email text,
  headshot_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_profiles TO authenticated;
GRANT ALL ON public.agent_profiles TO service_role;

ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agent profile"
  ON public.agent_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own agent profile"
  ON public.agent_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own agent profile"
  ON public.agent_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own agent profile"
  ON public.agent_profiles FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_agent_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_agent_profiles_updated_at
  BEFORE UPDATE ON public.agent_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_agent_profiles_updated_at();

-- 2) listing_pages
CREATE TABLE public.listing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_address text NOT NULL,
  share_token text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, property_address)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_pages TO authenticated;
GRANT ALL ON public.listing_pages TO service_role;

ALTER TABLE public.listing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own listing pages"
  ON public.listing_pages FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own listing pages"
  ON public.listing_pages FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own listing pages"
  ON public.listing_pages FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own listing pages"
  ON public.listing_pages FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS listing_pages_share_token_idx
  ON public.listing_pages (share_token);

-- 3) Public token-gated read
CREATE OR REPLACE FUNCTION public.get_listing_page(p_token text)
RETURNS TABLE (
  property_address text,
  created_at timestamptz,
  agent jsonb,
  stagings jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH lp AS (
    SELECT id, user_id, property_address, created_at
    FROM public.listing_pages
    WHERE share_token = p_token
    LIMIT 1
  )
  SELECT
    lp.property_address,
    lp.created_at,
    (
      SELECT to_jsonb(a) - 'user_id' - 'created_at' - 'updated_at'
      FROM public.agent_profiles a
      WHERE a.user_id = lp.user_id
    ) AS agent,
    COALESCE(
      (
        SELECT jsonb_agg(
                 jsonb_build_object(
                   'id', s.id,
                   'original_image_url', s.original_image_url,
                   'staged_image_url', s.staged_image_url,
                   'room_type', s.room_type,
                   'style', s.style,
                   'created_at', s.created_at,
                   'mls_disclosure', s.mls_disclosure
                 )
                 ORDER BY s.created_at ASC
               )
        FROM public.stagings s
        WHERE s.user_id = lp.user_id
          AND s.property_address = lp.property_address
      ),
      '[]'::jsonb
    ) AS stagings
  FROM lp;
$$;

REVOKE ALL ON FUNCTION public.get_listing_page(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_listing_page(text) TO anon, authenticated;
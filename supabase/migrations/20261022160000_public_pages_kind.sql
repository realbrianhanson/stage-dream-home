-- Public pages label each photo "Virtually staged" or "Virtually edited";
-- give them the real edit kind and disclosure flag instead of guessing.
DROP FUNCTION IF EXISTS public.get_shared_staging(text);
CREATE FUNCTION public.get_shared_staging(p_token text)
RETURNS TABLE (
  id uuid,
  original_image_url text,
  staged_image_url text,
  room_type text,
  style text,
  property_address text,
  created_at timestamptz,
  kind text,
  mls_disclosure boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, original_image_url, staged_image_url, room_type, style, property_address, created_at, kind, mls_disclosure
  FROM public.stagings
  WHERE share_token IS NOT NULL
    AND share_token = p_token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_shared_staging(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_staging(text) TO anon, authenticated;

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
                   'mls_disclosure', s.mls_disclosure,
                   'kind', s.kind
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

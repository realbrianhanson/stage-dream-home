
-- 1) Lock down usage table: prevent plan self-upgrade
DROP POLICY IF EXISTS "Users can update own usage" ON public.usage;
DROP POLICY IF EXISTS "Users can insert own usage" ON public.usage;

-- Restrict UPDATE to onboarding_complete column only via column-level grants
REVOKE UPDATE, INSERT ON public.usage FROM authenticated, anon;
GRANT UPDATE (onboarding_complete) ON public.usage TO authenticated;

-- Re-add narrow UPDATE policy (only own row; column restriction enforced by GRANT)
CREATE POLICY "Users can update own onboarding"
ON public.usage
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 2) Lock down shared stagings: replace permissive anon SELECT with token-gated RPC
DROP POLICY IF EXISTS "Public can view shared stagings" ON public.stagings;

CREATE OR REPLACE FUNCTION public.get_shared_staging(p_token text)
RETURNS TABLE (
  id uuid,
  original_image_url text,
  staged_image_url text,
  room_type text,
  style text,
  property_address text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, original_image_url, staged_image_url, room_type, style, property_address, created_at
  FROM public.stagings
  WHERE share_token IS NOT NULL
    AND share_token = p_token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_shared_staging(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_staging(text) TO anon, authenticated;

-- 3) Tighten check_and_increment_staging: only signed-in users
REVOKE ALL ON FUNCTION public.check_and_increment_staging(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_and_increment_staging(uuid) TO authenticated;

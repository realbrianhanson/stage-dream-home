DROP FUNCTION IF EXISTS public.decrement_staging();

CREATE OR REPLACE FUNCTION public.decrement_staging(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;

  UPDATE public.usage
  SET stagings_this_month = GREATEST(0, stagings_this_month - 1)
  WHERE user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.decrement_staging(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_staging(uuid) TO service_role;
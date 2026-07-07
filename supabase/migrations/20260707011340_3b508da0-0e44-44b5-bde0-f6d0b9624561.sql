CREATE OR REPLACE FUNCTION public.decrement_staging()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actual_user_id uuid;
BEGIN
  actual_user_id := auth.uid();
  IF actual_user_id IS NULL THEN RETURN; END IF;

  UPDATE public.usage
  SET stagings_this_month = GREATEST(0, stagings_this_month - 1)
  WHERE user_id = actual_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.decrement_staging() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decrement_staging() TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_staging() TO service_role;
-- Phase 1 hardening: per-plan monthly caps, DB-backed rate limit, storage lockdown.

-- 1) Per-plan monthly caps. Keep in sync with src/config/pricing.ts (monthlyQuota).
CREATE OR REPLACE FUNCTION public.plan_monthly_limit(p_plan text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_plan
    WHEN 'studio' THEN 500
    WHEN 'pro' THEN 300
    ELSE 3
  END;
$$;

-- 1b) Admins: unlimited stagings, no watermark, no rate limit (for demos).
-- The first account in a project becomes admin, so every remix gets its owner
-- as admin without hardcoding anyone. Clients can't write this column.
ALTER TABLE public.usage
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

UPDATE public.usage SET is_admin = true
WHERE user_id = (
  SELECT u.user_id FROM public.usage u
  JOIN auth.users au ON au.id = u.user_id
  ORDER BY au.created_at ASC LIMIT 1
)
AND NOT EXISTS (SELECT 1 FROM public.usage WHERE is_admin);

CREATE OR REPLACE FUNCTION public.handle_new_user_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Serialize so two simultaneous first signups can't both become admin.
  PERFORM pg_advisory_xact_lock(hashtext('realvision_first_admin'));
  INSERT INTO public.usage (user_id, plan, stagings_this_month, month_reset_at, is_admin)
  VALUES (
    NEW.id, 'free', 0, now(),
    NOT EXISTS (SELECT 1 FROM public.usage WHERE is_admin)
  );
  RETURN NEW;
END;
$$;

-- 2) Rate-limit window lives on the usage row so it survives edge isolates.
ALTER TABLE public.usage
  ADD COLUMN IF NOT EXISTS rl_window_start timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS rl_window_count integer NOT NULL DEFAULT 0;

-- 3) reserve_staging(): atomic quota + rate-limit check for the signed-in user.
-- Returns 'ok', 'quota_exceeded', 'rate_limited' or 'no_usage'.
-- check_and_increment_staging() stays for older deployed code until it redeploys.
CREATE OR REPLACE FUNCTION public.reserve_staging()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u public.usage%ROWTYPE;
  uid uuid := auth.uid();
  rl_max constant integer := 10;
  rl_window constant interval := interval '60 seconds';
BEGIN
  IF uid IS NULL THEN
    RETURN 'no_usage';
  END IF;

  SELECT * INTO u FROM public.usage WHERE user_id = uid FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'no_usage';
  END IF;

  IF u.month_reset_at < now() - interval '30 days' THEN
    u.stagings_this_month := 0;
    u.month_reset_at := now();
  END IF;

  IF u.is_admin THEN
    UPDATE public.usage
      SET stagings_this_month = u.stagings_this_month + 1,
          month_reset_at = u.month_reset_at
      WHERE user_id = uid;
    RETURN 'ok';
  END IF;

  IF u.rl_window_start < now() - rl_window THEN
    u.rl_window_start := now();
    u.rl_window_count := 0;
  END IF;

  IF u.rl_window_count >= rl_max THEN
    UPDATE public.usage
      SET stagings_this_month = u.stagings_this_month,
          month_reset_at = u.month_reset_at,
          rl_window_start = u.rl_window_start,
          rl_window_count = u.rl_window_count
      WHERE user_id = uid;
    RETURN 'rate_limited';
  END IF;

  IF u.stagings_this_month >= public.plan_monthly_limit(u.plan) THEN
    UPDATE public.usage
      SET stagings_this_month = u.stagings_this_month,
          month_reset_at = u.month_reset_at,
          rl_window_start = u.rl_window_start,
          rl_window_count = u.rl_window_count
      WHERE user_id = uid;
    RETURN 'quota_exceeded';
  END IF;

  UPDATE public.usage
    SET stagings_this_month = u.stagings_this_month + 1,
        month_reset_at = u.month_reset_at,
        rl_window_start = u.rl_window_start,
        rl_window_count = u.rl_window_count + 1
    WHERE user_id = uid;
  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_staging() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_staging() TO authenticated;

-- Legacy RPC: apply the same per-plan caps so old deployed code can't bypass them.
CREATE OR REPLACE FUNCTION public.check_and_increment_staging(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.reserve_staging() = 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_increment_staging(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_and_increment_staging(uuid) TO authenticated;

-- Refunds also give back the rate-limit slot so failed attempts don't count.
CREATE OR REPLACE FUNCTION public.decrement_staging(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;
  UPDATE public.usage
  SET stagings_this_month = GREATEST(0, stagings_this_month - 1),
      rl_window_count = GREATEST(0, rl_window_count - 1)
  WHERE user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.decrement_staging(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_staging(uuid) TO service_role;

-- 4) Storage: stop anyone from listing every user's files.
-- The bucket stays public so existing image URLs, shared stagings and listing
-- pages keep working; public object URLs don't go through these policies.
DROP POLICY IF EXISTS "Public read access for stagings" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own staging files" ON storage.objects;

CREATE POLICY "Users can read own staging files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'stagings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- upsert:true uploads need UPDATE on the user's own files.
DROP POLICY IF EXISTS "Users can update own staging files" ON storage.objects;
CREATE POLICY "Users can update own staging files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'stagings'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'stagings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Only images, and nothing huge, may land in the bucket.
UPDATE storage.buckets
  SET allowed_mime_types = ARRAY[
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'image/avif', 'image/heic', 'image/heif'
      ],
      file_size_limit = 26214400
  WHERE id = 'stagings';

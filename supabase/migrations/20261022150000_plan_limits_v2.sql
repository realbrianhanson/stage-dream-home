-- Monthly caps that match the new pricing (src/config/pricing.ts).
CREATE OR REPLACE FUNCTION public.plan_monthly_limit(p_plan text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_plan
    WHEN 'studio' THEN 300
    WHEN 'pro' THEN 100
    ELSE 3
  END;
$$;

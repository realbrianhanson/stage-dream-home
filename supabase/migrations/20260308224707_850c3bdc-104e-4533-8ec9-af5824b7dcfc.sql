
CREATE OR REPLACE FUNCTION public.check_and_increment_staging(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_usage RECORD;
  actual_user_id uuid;
BEGIN
  -- Use auth.uid() instead of the parameter to prevent spoofing
  actual_user_id := auth.uid();
  
  IF actual_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO current_usage FROM public.usage WHERE user_id = actual_user_id FOR UPDATE;
  
  IF current_usage IS NULL THEN
    RETURN false;
  END IF;

  IF current_usage.month_reset_at < NOW() - INTERVAL '30 days' THEN
    UPDATE public.usage SET stagings_this_month = 0, month_reset_at = NOW() WHERE user_id = actual_user_id;
    current_usage.stagings_this_month := 0;
  END IF;
  
  IF current_usage.plan = 'free' AND current_usage.stagings_this_month >= 3 THEN
    RETURN false;
  END IF;
  
  UPDATE public.usage SET stagings_this_month = stagings_this_month + 1 WHERE user_id = actual_user_id;
  RETURN true;
END;
$function$;

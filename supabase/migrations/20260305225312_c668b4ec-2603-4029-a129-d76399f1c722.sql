CREATE OR REPLACE FUNCTION public.check_and_increment_staging(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  current_usage RECORD;
BEGIN
  SELECT * INTO current_usage FROM public.usage WHERE user_id = p_user_id FOR UPDATE;
  
  IF current_usage IS NULL THEN
    RETURN false;
  END IF;

  -- Reset monthly counter if needed
  IF current_usage.month_reset_at < NOW() - INTERVAL '30 days' THEN
    UPDATE public.usage SET stagings_this_month = 0, month_reset_at = NOW() WHERE user_id = p_user_id;
    current_usage.stagings_this_month := 0;
  END IF;
  
  -- Check limit for free users
  IF current_usage.plan = 'free' AND current_usage.stagings_this_month >= 3 THEN
    RETURN false;
  END IF;
  
  -- Increment and allow
  UPDATE public.usage SET stagings_this_month = stagings_this_month + 1 WHERE user_id = p_user_id;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create usage table
CREATE TABLE public.usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'free',
  stagings_this_month integer NOT NULL DEFAULT 0,
  month_reset_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.usage ENABLE ROW LEVEL SECURITY;

-- Users can read own usage
CREATE POLICY "Users can view own usage"
  ON public.usage
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert own usage (for auto-create)
CREATE POLICY "Users can insert own usage"
  ON public.usage
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update own usage (for incrementing counter)
CREATE POLICY "Users can update own usage"
  ON public.usage
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Auto-create usage row on signup via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usage (user_id, plan, stagings_this_month, month_reset_at)
  VALUES (NEW.id, 'free', 0, now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_usage
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_usage();

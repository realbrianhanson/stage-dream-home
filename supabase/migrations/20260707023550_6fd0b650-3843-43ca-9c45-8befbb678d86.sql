
CREATE TABLE public.generation_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  kind text NOT NULL,
  room_type text,
  style text,
  plan text,
  success boolean NOT NULL,
  error_text text,
  duration_ms integer,
  mls_disclosure boolean NOT NULL DEFAULT false
);
GRANT ALL ON public.generation_logs TO service_role;
ALTER TABLE public.generation_logs ENABLE ROW LEVEL SECURITY;
-- No policies: service-role bypasses RLS; no client (anon/authenticated) can read or write.

CREATE TABLE public.client_errors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid,
  path text,
  message text,
  stack text
);
GRANT INSERT ON public.client_errors TO authenticated;
GRANT ALL ON public.client_errors TO service_role;
ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert client errors"
  ON public.client_errors
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
-- No SELECT/UPDATE/DELETE policies: clients cannot read or modify rows.

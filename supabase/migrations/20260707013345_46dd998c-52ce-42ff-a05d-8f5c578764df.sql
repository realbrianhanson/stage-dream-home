ALTER TABLE public.usage
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

CREATE INDEX IF NOT EXISTS usage_stripe_customer_idx ON public.usage(stripe_customer_id);
CREATE INDEX IF NOT EXISTS usage_stripe_subscription_idx ON public.usage(stripe_subscription_id);
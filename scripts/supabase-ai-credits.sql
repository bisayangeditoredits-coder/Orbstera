-- Orbstera AI credits (monthly) — apply in Supabase SQL editor or via migration tool.
-- Users need RLS/policy updates only if inserts/updates from the client fail; API routes use the session user.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS monthly_ai_credits_used integer NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS credits_cycle_key text;

COMMENT ON COLUMN public.profiles.monthly_ai_credits_used IS 'Credits consumed in the UTC month keyed by credits_cycle_key (YYYY-MM).';
COMMENT ON COLUMN public.profiles.credits_cycle_key IS 'UTC year-month marker for monthly_ai_credits_used; refreshed on consumption or billing sync.';

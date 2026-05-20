-- Scale foundation: unified credit caps, planner indexes, ai spend tracking

-- Align SQL defaults with src/lib/billing/credit-cap-defaults.ts
CREATE OR REPLACE FUNCTION public.plan_default_monthly_cap(p_plan text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(coalesce(p_plan, 'free'))
    WHEN 'student_pro' THEN 500
    WHEN 'pro' THEN 500
    WHEN 'creator_pro' THEN 1125
    WHEN 'admin' THEN 100000
    ELSE 150
  END;
$$;

-- Remote config defaults (idempotent upsert)
INSERT INTO public.credit_configs (id, config)
VALUES (
  'default',
  '{
    "monthly": {
      "free": 150,
      "student_pro": 500,
      "pro": 500,
      "creator_pro": 1125,
      "admin": 100000
    },
    "usdPerCredit": 0.008
  }'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  config = EXCLUDED.config,
  updated_at = now();

-- Planner query performance
CREATE INDEX IF NOT EXISTS chat_sessions_user_id_idx ON public.chat_sessions (user_id);
CREATE INDEX IF NOT EXISTS chat_messages_session_id_idx ON public.chat_messages (session_id);

-- Ledger time-range queries (admin / analytics)
CREATE INDEX IF NOT EXISTS credit_ledger_user_created_idx
  ON public.credit_ledger (user_id, created_at DESC);

-- Monthly AI spend estimate (used by src/lib/ai/spend.ts)
CREATE TABLE IF NOT EXISTS public.ai_spend_monthly (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  month_key text NOT NULL,
  estimated_usd numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, month_key)
);

ALTER TABLE public.ai_spend_monthly ENABLE ROW LEVEL SECURITY;

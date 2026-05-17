-- Remote credit config (optional overrides for caps and usdPerCredit)
CREATE TABLE IF NOT EXISTS public.credit_configs (
  id text PRIMARY KEY,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.credit_configs (id, config)
VALUES (
  'default',
  '{
    "monthly": {
      "free": 100,
      "student_pro": 1400,
      "pro": 2500,
      "creator_pro": 5500,
      "admin": 100000
    },
    "usdPerCredit": 0.0015
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Dodo webhook idempotency
CREATE TABLE IF NOT EXISTS public.dodo_webhook_events (
  event_id text PRIMARY KEY,
  processed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dodo_webhook_events ENABLE ROW LEVEL SECURITY;

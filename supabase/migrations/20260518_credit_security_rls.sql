-- Credit security: RLS, hardened RPC (service_role only), idempotency, refund.

-- Ledger idempotency column (if credit_ledger exists)
ALTER TABLE public.credit_ledger
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS credit_ledger_user_idempotency_unique
  ON public.credit_ledger (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Plan → default monthly cap (must match src/lib/billing/credits.ts)
CREATE OR REPLACE FUNCTION public.plan_default_monthly_cap(p_plan text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(coalesce(p_plan, 'free'))
    WHEN 'student_pro' THEN 1400
    WHEN 'pro' THEN 2500
    WHEN 'creator_pro' THEN 5500
    WHEN 'admin' THEN 100000
    ELSE 100
  END;
$$;

-- Validate cost for action (fixed or deck range with images)
CREATE OR REPLACE FUNCTION public.credit_action_cost_valid(p_action text, p_cost integer)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(coalesce(p_action, ''))
    WHEN 'deck_small' THEN p_cost >= 40 AND p_cost <= 200
    WHEN 'deck_medium' THEN p_cost >= 80 AND p_cost <= 240
    WHEN 'deck_large' THEN p_cost >= 150 AND p_cost <= 310
    WHEN 'deck_polish' THEN p_cost >= 40 AND p_cost <= 240
    WHEN 'magic_edit' THEN p_cost = 5
    WHEN 'rewrite' THEN p_cost = 3
    WHEN 'image_standard' THEN p_cost = 10
    WHEN 'image_premium' THEN p_cost = 20
    WHEN 'animation_enhance' THEN p_cost = 5
    ELSE false
  END;
$$;

-- Service-role only: consume credits for explicit user id
CREATE OR REPLACE FUNCTION public.consume_credits_atomic_v2(
  p_user_id uuid,
  p_cost integer,
  p_action text,
  p_meta jsonb DEFAULT '{}'::jsonb,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used integer;
  v_db_cap integer;
  v_plan text;
  cap integer;
  v_new_used integer;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_USER');
  END IF;

  IF p_cost IS NULL OR p_cost <= 0 THEN
    RETURN jsonb_build_object('ok', true, 'duplicate', false);
  END IF;

  IF p_cost > 500 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'COST_TOO_HIGH');
  END IF;

  IF NOT public.credit_action_cost_valid(p_action, p_cost) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_COST_FOR_ACTION');
  END IF;

  IF p_idempotency_key IS NOT NULL AND length(trim(p_idempotency_key)) > 0 THEN
    IF EXISTS (
      SELECT 1 FROM public.credit_ledger
      WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key
    ) THEN
      RETURN jsonb_build_object('ok', true, 'duplicate', true);
    END IF;
  END IF;

  SELECT p.credits_used_month, p.credits_monthly_limit, p.plan
  INTO v_used, v_db_cap, v_plan
  FROM public.profiles p
  WHERE p.id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NO_PROFILE');
  END IF;

  cap := COALESCE(v_db_cap, public.plan_default_monthly_cap(v_plan));

  IF v_used + p_cost > cap THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INSUFFICIENT_CREDITS');
  END IF;

  UPDATE public.profiles p
  SET
    credits_used_month = p.credits_used_month + p_cost,
    updated_at = now()
  WHERE p.id = p_user_id
  RETURNING p.credits_used_month INTO v_new_used;

  INSERT INTO public.credit_ledger (user_id, delta, reason, meta, idempotency_key)
  VALUES (
    p_user_id,
    -p_cost,
    p_action,
    COALESCE(p_meta, '{}'::jsonb),
    NULLIF(trim(p_idempotency_key), '')
  );

  RETURN jsonb_build_object('ok', true, 'credits_used_month', v_new_used, 'duplicate', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_credits_atomic_v2(
  p_user_id uuid,
  p_cost integer,
  p_idempotency_key text,
  p_reason text DEFAULT 'refund'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  refund_key text;
  v_new_used integer;
BEGIN
  IF p_user_id IS NULL OR p_cost IS NULL OR p_cost <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_ARGS');
  END IF;

  refund_key := 'refund:' || coalesce(p_idempotency_key, '');

  IF EXISTS (
    SELECT 1 FROM public.credit_ledger
    WHERE user_id = p_user_id AND idempotency_key = refund_key
  ) THEN
    RETURN jsonb_build_object('ok', true, 'duplicate', true);
  END IF;

  UPDATE public.profiles p
  SET
    credits_used_month = greatest(0, p.credits_used_month - p_cost),
    updated_at = now()
  WHERE p.id = p_user_id
  RETURNING p.credits_used_month INTO v_new_used;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NO_PROFILE');
  END IF;

  INSERT INTO public.credit_ledger (user_id, delta, reason, meta, idempotency_key)
  VALUES (p_user_id, p_cost, p_reason, '{}'::jsonb, refund_key);

  RETURN jsonb_build_object('ok', true, 'credits_used_month', v_new_used);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_credits_atomic_v2(uuid, integer, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_credits_atomic_v2(uuid, integer, text, jsonb, text) TO service_role;

REVOKE ALL ON FUNCTION public.refund_credits_atomic_v2(uuid, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refund_credits_atomic_v2(uuid, integer, text, text) TO service_role;

-- Revoke client-callable v1 RPC
REVOKE EXECUTE ON FUNCTION public.consume_credits_atomic(integer, integer, text, jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_credits_atomic(integer, integer, text, jsonb) FROM anon;

-- Prevent users from tampering with billing columns on profiles
CREATE OR REPLACE FUNCTION public.profiles_guard_billing_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF coalesce(auth.jwt() ->> 'role', '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() = NEW.id THEN
    IF NEW.plan IS DISTINCT FROM OLD.plan
       OR NEW.credits_used_month IS DISTINCT FROM OLD.credits_used_month
       OR NEW.credits_monthly_limit IS DISTINCT FROM OLD.credits_monthly_limit
       OR NEW.credits_reset_at IS DISTINCT FROM OLD.credits_reset_at
       OR NEW.free_generative_fill_uses IS DISTINCT FROM OLD.free_generative_fill_uses
       OR NEW.free_magic_edit_uses IS DISTINCT FROM OLD.free_magic_edit_uses
    THEN
      RAISE EXCEPTION 'billing_fields_readonly' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_billing_columns_trigger ON public.profiles;
CREATE TRIGGER profiles_guard_billing_columns_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_guard_billing_columns();

-- RLS: profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS: credit_ledger
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS credit_ledger_select_own ON public.credit_ledger;
CREATE POLICY credit_ledger_select_own ON public.credit_ledger
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE for authenticated on ledger

-- RLS: credit_configs
ALTER TABLE public.credit_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS credit_configs_select_authenticated ON public.credit_configs;
CREATE POLICY credit_configs_select_authenticated ON public.credit_configs
  FOR SELECT TO authenticated
  USING (true);

-- RLS: dodo_webhook_events (no client access) — only runs if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'dodo_webhook_events'
  ) THEN
    EXECUTE 'ALTER TABLE public.dodo_webhook_events ENABLE ROW LEVEL SECURITY';
  END IF;
END;
$$;

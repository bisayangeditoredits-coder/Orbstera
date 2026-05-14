-- Atomic credit consumption for authenticated users (auth.uid()).
-- Apply in Supabase SQL Editor or via `supabase db push`.
-- Grants: callers use the Next.js server route with the user's JWT (anon key + cookies).

CREATE OR REPLACE FUNCTION public.consume_credits_atomic(
  p_cost integer,
  p_plan_default_cap integer,
  p_action text,
  p_meta jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_used integer;
  v_db_cap integer;
  cap integer;
  v_new_used integer;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  IF p_cost IS NULL OR p_cost <= 0 THEN
    RETURN jsonb_build_object('ok', true);
  END IF;

  SELECT p.credits_used_month, p.credits_monthly_limit
  INTO v_used, v_db_cap
  FROM public.profiles p
  WHERE p.id = uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NO_PROFILE');
  END IF;

  cap := COALESCE(v_db_cap, p_plan_default_cap);

  IF v_used + p_cost > cap THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INSUFFICIENT_CREDITS');
  END IF;

  UPDATE public.profiles p
  SET
    credits_used_month = p.credits_used_month + p_cost,
    updated_at = now()
  WHERE p.id = uid
  RETURNING p.credits_used_month INTO v_new_used;

  BEGIN
    INSERT INTO public.credit_ledger (user_id, delta, reason, meta)
    VALUES (uid, -p_cost, p_action, COALESCE(p_meta, '{}'::jsonb));
  EXCEPTION
    WHEN SQLSTATE '42P01' THEN
      NULL;
  END;

  RETURN jsonb_build_object('ok', true, 'credits_used_month', v_new_used);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_credits_atomic(integer, integer, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_credits_atomic(integer, integer, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_credits_atomic(integer, integer, text, jsonb) TO service_role;

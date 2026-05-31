-- Atomic free-tier usage counters (prevents concurrent bypass of lifetime/monthly caps)

CREATE OR REPLACE FUNCTION public.increment_free_tier_usage_atomic(
  p_user_id uuid,
  p_field text,
  p_limit integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current integer;
  v_next integer;
BEGIN
  IF p_field NOT IN (
    'free_magic_edit_uses',
    'free_generative_fill_uses',
    'free_ai_deck_generations'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_FIELD');
  END IF;

  IF p_limit IS NULL OR p_limit < 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_LIMIT');
  END IF;

  IF p_field = 'free_magic_edit_uses' THEN
    SELECT free_magic_edit_uses INTO v_current FROM profiles WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'USER_NOT_FOUND');
    END IF;
    v_current := COALESCE(v_current, 0);
    IF v_current >= p_limit THEN
      RETURN jsonb_build_object('ok', false, 'error', 'LIMIT_REACHED', 'used', v_current);
    END IF;
    v_next := v_current + 1;
    UPDATE profiles SET free_magic_edit_uses = v_next WHERE id = p_user_id;
    RETURN jsonb_build_object('ok', true, 'used', v_next);
  ELSIF p_field = 'free_generative_fill_uses' THEN
    SELECT free_generative_fill_uses INTO v_current FROM profiles WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'USER_NOT_FOUND');
    END IF;
    v_current := COALESCE(v_current, 0);
    IF v_current >= p_limit THEN
      RETURN jsonb_build_object('ok', false, 'error', 'LIMIT_REACHED', 'used', v_current);
    END IF;
    v_next := v_current + 1;
    UPDATE profiles SET free_generative_fill_uses = v_next WHERE id = p_user_id;
    RETURN jsonb_build_object('ok', true, 'used', v_next);
  ELSE
    SELECT free_ai_deck_generations INTO v_current FROM profiles WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'USER_NOT_FOUND');
    END IF;
    v_current := COALESCE(v_current, 0);
    IF v_current >= p_limit THEN
      RETURN jsonb_build_object('ok', false, 'error', 'LIMIT_REACHED', 'used', v_current);
    END IF;
    v_next := v_current + 1;
    UPDATE profiles SET free_ai_deck_generations = v_next WHERE id = p_user_id;
    RETURN jsonb_build_object('ok', true, 'used', v_next);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_free_tier_usage_atomic(
  p_user_id uuid,
  p_field text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current integer;
  v_next integer;
BEGIN
  IF p_field NOT IN (
    'free_magic_edit_uses',
    'free_generative_fill_uses',
    'free_ai_deck_generations'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_FIELD');
  END IF;

  IF p_field = 'free_magic_edit_uses' THEN
    SELECT free_magic_edit_uses INTO v_current FROM profiles WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'USER_NOT_FOUND'); END IF;
    v_next := GREATEST(0, COALESCE(v_current, 0) - 1);
    UPDATE profiles SET free_magic_edit_uses = v_next WHERE id = p_user_id;
    RETURN jsonb_build_object('ok', true, 'used', v_next);
  ELSIF p_field = 'free_generative_fill_uses' THEN
    SELECT free_generative_fill_uses INTO v_current FROM profiles WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'USER_NOT_FOUND'); END IF;
    v_next := GREATEST(0, COALESCE(v_current, 0) - 1);
    UPDATE profiles SET free_generative_fill_uses = v_next WHERE id = p_user_id;
    RETURN jsonb_build_object('ok', true, 'used', v_next);
  ELSE
    SELECT free_ai_deck_generations INTO v_current FROM profiles WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'USER_NOT_FOUND'); END IF;
    v_next := GREATEST(0, COALESCE(v_current, 0) - 1);
    UPDATE profiles SET free_ai_deck_generations = v_next WHERE id = p_user_id;
    RETURN jsonb_build_object('ok', true, 'used', v_next);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_free_tier_usage_atomic(uuid, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decrement_free_tier_usage_atomic(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_free_tier_usage_atomic(uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrement_free_tier_usage_atomic(uuid, text) TO service_role;

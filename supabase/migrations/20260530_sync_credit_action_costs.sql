-- Align credit_action_cost_valid with src/lib/billing/credits.ts (May 2026 calibration).
-- Paid users were blocked when app charged rewrite=1 but SQL required rewrite=3.

CREATE OR REPLACE FUNCTION public.credit_action_cost_valid(p_action text, p_cost integer)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(coalesce(p_action, ''))
    WHEN 'deck_small' THEN p_cost >= 40 AND p_cost <= 60
    WHEN 'deck_medium' THEN p_cost >= 70 AND p_cost <= 100
    WHEN 'deck_large' THEN p_cost >= 200 AND p_cost <= 250
    WHEN 'deck_polish' THEN p_cost >= 70 AND p_cost <= 90
    WHEN 'magic_edit' THEN p_cost >= 1 AND p_cost <= 5
    WHEN 'rewrite' THEN p_cost >= 1 AND p_cost <= 3
    WHEN 'image_standard' THEN p_cost >= 3 AND p_cost <= 10
    WHEN 'image_premium' THEN p_cost >= 5 AND p_cost <= 12
    WHEN 'genfill_free' THEN p_cost >= 3 AND p_cost <= 10
    WHEN 'genfill_pro' THEN p_cost >= 5 AND p_cost <= 12
    WHEN 'genfill_creator' THEN p_cost >= 8 AND p_cost <= 15
    WHEN 'animation_enhance' THEN p_cost >= 1 AND p_cost <= 5
    WHEN 'recraft_v2_raster' THEN p_cost >= 1 AND p_cost <= 5
    WHEN 'recraft_v3_vector' THEN p_cost >= 5 AND p_cost <= 15
    ELSE false
  END;
$$;

-- Align plan caps with src/lib/billing/credit-cap-defaults.ts
CREATE OR REPLACE FUNCTION public.plan_default_monthly_cap(p_plan text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(coalesce(p_plan, 'free'))
    WHEN 'student_pro' THEN 526
    WHEN 'pro' THEN 526
    WHEN 'creator_pro' THEN 1315
    WHEN 'admin' THEN 100000
    ELSE 150
  END;
$$;

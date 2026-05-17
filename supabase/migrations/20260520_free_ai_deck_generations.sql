-- Lifetime free AI deck counter (strict limit; service role / RPC only for writes)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_ai_deck_generations integer NOT NULL DEFAULT 0;

-- Extend billing guard
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
       OR NEW.free_ai_deck_generations IS DISTINCT FROM OLD.free_ai_deck_generations
    THEN
      RAISE EXCEPTION 'billing_fields_readonly' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

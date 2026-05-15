-- Migration: Free-tier per-feature usage limit counters
-- Generative Fill: max 5 uses/month for free accounts
-- AI Magic Edit:   max 10 uses/month for free accounts

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS free_generative_fill_uses integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_magic_edit_uses       integer NOT NULL DEFAULT 0;

-- Optional: reset counters monthly via a cron job or Supabase scheduled function
-- UPDATE profiles SET free_generative_fill_uses = 0, free_magic_edit_uses = 0;

-- Add brand_kit JSONB column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS brand_kit JSONB DEFAULT '{}'::jsonb;

-- Orbstera Database Indexes (Phase 3 Scalability)
-- Please run this script in your Supabase SQL Editor.

-- 1. Index on templates.slug to fix full table scans on the template viewer
CREATE INDEX IF NOT EXISTS idx_templates_slug ON templates (slug);



-- 3. Index on ai_usage_events.user_id to prevent heavy analytical queries from slowing down the DB
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_user_id ON ai_usage_events (user_id);

-- 4. Index on profiles.plan to speed up the Admin dashboard query
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON profiles (plan);

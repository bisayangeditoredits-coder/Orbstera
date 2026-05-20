-- Scale ops: ai_spend_monthly client deny + planner message ordering index

-- No client access; API writes via service role (bypasses RLS)
DROP POLICY IF EXISTS ai_spend_monthly_deny_authenticated ON public.ai_spend_monthly;
CREATE POLICY ai_spend_monthly_deny_authenticated ON public.ai_spend_monthly
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Ordered planner history per session
CREATE INDEX IF NOT EXISTS chat_messages_session_created_idx
  ON public.chat_messages (session_id, created_at ASC);

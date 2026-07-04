-- Flags a communications row as a one-off custom/personalized send (subject+body
-- typed for that specific send) rather than a saved email_templates row, so Send
-- History can badge it distinctly.
ALTER TABLE public.communications
  ADD COLUMN IF NOT EXISTS is_custom BOOLEAN NOT NULL DEFAULT false;

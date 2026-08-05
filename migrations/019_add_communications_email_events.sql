-- Engagement columns populated by the Resend webhook (app/api/webhooks/resend/route.ts):
-- delivery confirmation, open tracking (first + most recent + count), and
-- bounce/complaint outcomes. Click tracking is intentionally not tracked here —
-- household_link_open_count already answers "did they reach the site."
ALTER TABLE public.communications
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS open_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS complained_at TIMESTAMPTZ;

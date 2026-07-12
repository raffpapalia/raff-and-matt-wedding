-- 017: Track the most recent invite-link open, alongside the existing
-- first-open timestamp and open count, so the admin comms detail page can
-- show "Last opened" next to "First opened".
ALTER TABLE public.households
  ADD COLUMN IF NOT EXISTS link_last_opened_at TIMESTAMPTZ;

-- Backfill: for households already opened at least once, first-open is the
-- best available estimate of the last open until the next real visit updates it.
UPDATE public.households
SET link_last_opened_at = link_first_opened_at
WHERE link_first_opened_at IS NOT NULL AND link_last_opened_at IS NULL;

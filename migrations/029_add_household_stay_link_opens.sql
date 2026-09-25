-- 029: Track opens of the room interest page (/invite/[slug]/stay), kept
-- separate from the invite link's own link_open_count / link_first_opened_at /
-- link_last_opened_at so visiting the stay page never counts as opening the
-- invitation. Bumped by app/invite/[slug]/stay/page.tsx; admin visits skipped.
ALTER TABLE public.households
  ADD COLUMN IF NOT EXISTS stay_link_open_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stay_link_first_opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stay_link_last_opened_at TIMESTAMPTZ;

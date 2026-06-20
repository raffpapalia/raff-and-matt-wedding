-- Add phase tracking to communications table, matching the phases.current_phase enum
-- (save_the_date, invitation, pre_wedding, thank_you). No enum type exists on phases —
-- it's TEXT with a CHECK constraint — so this follows the same pattern.
ALTER TABLE public.communications
  ADD COLUMN IF NOT EXISTS phase TEXT;

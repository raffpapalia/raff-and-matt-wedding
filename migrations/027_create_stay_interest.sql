-- 027: QT room block expression of interest (/invite/[slug]/stay).
--
-- Not a booking: one row per household saying roughly whether they'd stay,
-- which nights and how many rooms, so the couple can negotiate a group rate.
-- Guests confirm actual rooms later at RSVP. Upserted on household_id so a
-- household can change its answer.
--
-- Like the registry tables: RLS enabled with NO policies, so only the
-- service-role client (supabaseServer) can read or write it.

CREATE TABLE IF NOT EXISTS public.stay_interest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL UNIQUE REFERENCES public.households(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('yes', 'maybe', 'no')),
  night_before BOOLEAN NOT NULL DEFAULT FALSE,
  wedding_night BOOLEAN NOT NULL DEFAULT FALSE,
  staying_longer BOOLEAN NOT NULL DEFAULT FALSE,
  rooms INT CHECK (rooms BETWEEN 1 AND 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 'no' carries no nights and no rooms. 'yes'/'maybe' need a room count and
  -- either "staying longer" on its own, or at least one of the two named nights.
  CONSTRAINT stay_interest_shape CHECK (
    (status = 'no'
      AND NOT night_before AND NOT wedding_night AND NOT staying_longer
      AND rooms IS NULL)
    OR
    (status IN ('yes', 'maybe')
      AND rooms IS NOT NULL
      AND (
        (staying_longer AND NOT night_before AND NOT wedding_night)
        OR night_before OR wedding_night
      ))
  )
);

-- ── updated_at trigger (public.update_updated_at_column from migration 001) ──
DROP TRIGGER IF EXISTS update_stay_interest_updated_at ON public.stay_interest;
CREATE TRIGGER update_stay_interest_updated_at BEFORE UPDATE ON public.stay_interest
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.stay_interest ENABLE ROW LEVEL SECURITY;

-- ── Settings seed (settings.value is jsonb, so this is a JSON boolean) ───────
-- Flip to false to close the form before RSVP launches.
INSERT INTO public.settings (key, value, updated_at) VALUES
  ('stay_eoi_open', 'true', now())
ON CONFLICT (key) DO NOTHING;

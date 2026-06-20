-- Adds a random, unguessable short code per household for SMS-friendly short links
-- (mattandraff.com/i/{code} -> /invite/{slug}). Codes are NOT derived from slug/name —
-- they're random so households can't be enumerated by guessing — and use a 32-character
-- alphabet that excludes 0/O and 1/I look-alikes (codes are uppercase-only, so lowercase
-- l never appears) so codes stay unambiguous when read off a phone screen or typed by hand.
ALTER TABLE public.households
  ADD COLUMN IF NOT EXISTS short_code TEXT UNIQUE;

CREATE OR REPLACE FUNCTION public.generate_household_short_code()
RETURNS TEXT AS $$
DECLARE
  alphabet TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  code TEXT;
  i INT;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..5 LOOP
      code := code || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.households WHERE short_code = code);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.set_household_short_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.short_code IS NULL THEN
    NEW.short_code := public.generate_household_short_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS households_set_short_code ON public.households;
CREATE TRIGGER households_set_short_code
  BEFORE INSERT ON public.households
  FOR EACH ROW EXECUTE FUNCTION public.set_household_short_code();

-- Backfill existing households one row (one statement) at a time, rather than a single
-- bulk UPDATE, so each row's uniqueness check can see codes assigned earlier in the same
-- backfill run (a single UPDATE evaluates all rows against one snapshot and could pick
-- the same code twice without "seeing" each other).
DO $$
DECLARE
  h RECORD;
BEGIN
  FOR h IN SELECT id FROM public.households WHERE short_code IS NULL LOOP
    UPDATE public.households SET short_code = public.generate_household_short_code() WHERE id = h.id;
  END LOOP;
END;
$$;

ALTER TABLE public.households
  ALTER COLUMN short_code SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_households_short_code ON public.households(short_code);

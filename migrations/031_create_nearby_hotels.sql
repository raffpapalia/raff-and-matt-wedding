-- 031: "Where to stay" guest page (/invite/[slug]/stay).
--
-- nearby_hotels: the list of other hotels near the venue shown under the QT
-- discount code. No booking, payment or guest data is stored; guests book QT
-- themselves on QT's site. Like the registry tables: RLS enabled with NO
-- policies, so only the service-role client (supabaseServer) can read or write.
--
-- map_x / map_y use the stay page map's own coordinate system: the SVG viewBox
-- is "380 -40 560 480" and the QT venue sits at (600, 258). Russell St is
-- x 600 and Collins St is y 300.

CREATE TABLE IF NOT EXISTS public.nearby_hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  street TEXT NOT NULL,
  walk_minutes INT NOT NULL,
  price_tier INT NOT NULL CHECK (price_tier BETWEEN 1 AND 4),
  blurb TEXT NOT NULL,
  website_url TEXT,
  map_x NUMERIC NOT NULL,
  map_y NUMERIC NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nearby_hotels ENABLE ROW LEVEL SECURITY;

-- updated_at trigger (public.update_updated_at_column from migration 001)
DROP TRIGGER IF EXISTS nearby_hotels_updated_at ON public.nearby_hotels;
CREATE TRIGGER nearby_hotels_updated_at
  BEFORE UPDATE ON public.nearby_hotels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed rows. PLACEHOLDERS TO VERIFY: names, streets, walk times, price tiers and
-- blurbs come from the approved mockup and have not been checked against the
-- real hotels. website_url is left NULL on purpose; fill those in via
-- /admin/hotels. Only seeds an empty table, so re-running never duplicates.
INSERT INTO public.nearby_hotels
  (name, street, walk_minutes, price_tier, blurb, map_x, map_y, display_order)
SELECT v.* FROM (VALUES
  ('Quincy Hotel',          'Little Collins St', 3, 2, 'Rooftop pool and bar.',                          685, 250, 1),
  ('The Westin Melbourne',  'Collins St',        3, 3, 'Right on City Square.',                          545, 305, 2),
  ('Adelphi Hotel',         'Flinders Lane',     4, 3, 'Small boutique hotel on a laneway.',             560, 352, 3),
  ('Grand Hyatt Melbourne', 'Collins St',        3, 3, 'Big hotel, lots of room types.',                 650, 302, 4),
  ('Mantra on Russell',     'Russell St',        4, 2, 'Apartments with kitchens. Good for families.',   600, 125, 5),
  ('Rydges Melbourne',      'Exhibition St',     5, 1, 'Simple and good value.',                         695, 135, 6),
  ('Sofitel on Collins',    'Collins St',        6, 4, 'High floors, big city views.',                   770, 300, 7),
  ('Ovolo Laneways',        'Little Bourke St',  7, 2, 'Fun boutique hotel near Parliament.',            778, 150, 8),
  ('Hotel Lindrum',         'Flinders St',       7, 3, 'Boutique, in an old billiards hall.',            745, 400, 9),
  ('Park Hyatt Melbourne',  'Parliament Sq',     9, 4, 'Quiet, near the Fitzroy Gardens.',               875, 165, 10)
) AS v(name, street, walk_minutes, price_tier, blurb, map_x, map_y, display_order)
WHERE NOT EXISTS (SELECT 1 FROM public.nearby_hotels);

-- Settings (jsonb values, same shape as migration 021). ON CONFLICT DO NOTHING so
-- re-running never clobbers values you've since edited in the admin.
INSERT INTO public.settings (key, value, updated_at) VALUES
  ('stay_page_enabled', 'false', now()),
  ('qt_booking_code', '"EVENTQTME"', now()),
  ('qt_booking_url', '""', now()),
  ('hotel_checkin', '"From 3 PM"', now()),
  ('hotel_checkout', '"By 11 AM"', now()),
  ('venue_street', '"133 Russell St"', now())
ON CONFLICT (key) DO NOTHING;

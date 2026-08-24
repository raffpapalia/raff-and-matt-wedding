-- 024: Travel-story section on the registry page — a short narrative plus a
-- photo strip, sitting between the hero and the funds/items so the couple's
-- own travel history frames the ask before guests see anything to give toward.

INSERT INTO public.settings (key, value, updated_at) VALUES
  ('registry_story_heading', '""', now()),
  ('registry_story_body', '""', now()),
  ('registry_travel_photos', '[]', now())
ON CONFLICT (key) DO NOTHING;

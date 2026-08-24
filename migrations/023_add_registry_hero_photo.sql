-- 023: Dedicated hero photo for the registry page.
--
-- Previously the registry hero reused the couple's main site photo
-- (couple_photo_url), which meant changing it also changed every other guest
-- phase that uses that setting. This gives the registry its own photo,
-- falling back to couple_photo_url when unset so the hero isn't ever blank.

INSERT INTO public.settings (key, value, updated_at) VALUES
  ('registry_hero_photo_url', '""', now())
ON CONFLICT (key) DO NOTHING;

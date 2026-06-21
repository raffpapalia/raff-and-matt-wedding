-- Add couple_photo_url setting for pre-wedding couple photo
-- Used on save the date and invitation pages
-- Separate from wedding_photo_url which is for the post-wedding thank you page
INSERT INTO public.settings (key, value, updated_at)
VALUES ('couple_photo_url', '""', now())
ON CONFLICT (key) DO NOTHING;

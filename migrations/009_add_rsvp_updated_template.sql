-- Adds the 'rsvp_updated' template (email + sms), sent when a household re-submits
-- an RSVP that was already on file, as distinct from 'rsvp_confirmation' which is
-- only sent on a household's first-ever RSVP submission. Mirrors the existing
-- rsvp_confirmation rows added in 005/008.
INSERT INTO public.email_templates (key, phase, subject, body, trigger_type, is_active, channel)
VALUES
  (
    'rsvp_updated',
    'invitation',
    'Your RSVP has been updated — Matt & Raff',
    E'Hi {{first_name}},\n\nThanks for updating your RSVP — we''ve got your latest response on file.\n\nDate: {{wedding_date}}\nVenue: {{venue}}\n\nWe''ll be in touch with more details as the big day approaches.\n\nWith love,\nMatt & Raff',
    'event',
    TRUE,
    'email'
  ),
  (
    'rsvp_updated',
    'invitation',
    NULL,
    'Hi {{first_name}}, your RSVP for Matt & Raff''s wedding has been updated. Thanks for letting us know!',
    'event',
    TRUE,
    'sms'
  )
ON CONFLICT (key, channel) DO NOTHING;

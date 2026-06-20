-- Extends email_templates into a unified templates table that holds both email and
-- SMS content, rather than renaming/splitting the table — this keeps every existing
-- reference (lib/email/renderTemplate.tsx, the admin Templates UI/API routes) working
-- unchanged for the email side, and SMS just becomes a second channel in the same table.
ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms'));

-- SMS rows have no subject (plain-text body only).
ALTER TABLE public.email_templates
  ALTER COLUMN subject DROP NOT NULL;

-- `key` was unique on its own (one row per key); now an 'invitation' email row and an
-- 'invitation' sms row need to coexist, so uniqueness moves to (key, channel).
ALTER TABLE public.email_templates
  DROP CONSTRAINT IF EXISTS email_templates_key_key;

ALTER TABLE public.email_templates
  ADD CONSTRAINT email_templates_key_channel_key UNIQUE (key, channel);

-- Seed one SMS row per email row's key. Where settings already has hand-written SMS
-- copy (save_the_date, rsvp_reminder, rsvp_confirmation), carry it over via COALESCE so
-- nothing already in use is lost; everything else gets short placeholder copy. The short
-- link is auto-injected by the send engine, not a typed merge tag, so none of these
-- bodies reference a link placeholder.
INSERT INTO public.email_templates (key, phase, subject, body, trigger_type, is_active, channel)
VALUES
  (
    'save_the_date',
    'save_the_date',
    NULL,
    COALESCE(
      (SELECT value #>> '{}' FROM public.settings WHERE key = 'tmpl_sms_save_the_date'),
      'Hi {{first_name}}! Save the date — Matt & Raff are getting married. Details:'
    ),
    'phase',
    TRUE,
    'sms'
  ),
  (
    'invitation',
    'invitation',
    NULL,
    'Hi {{first_name}}, you''re invited to Matt & Raff''s wedding! View your invite:',
    'phase',
    TRUE,
    'sms'
  ),
  (
    'rsvp_reminder',
    'invitation',
    NULL,
    COALESCE(
      (SELECT value #>> '{}' FROM public.settings WHERE key = 'tmpl_sms_rsvp_reminder'),
      'Hi {{first_name}}, don''t forget to RSVP for Matt & Raff''s wedding!'
    ),
    'manual',
    TRUE,
    'sms'
  ),
  (
    'rsvp_confirmation',
    'invitation',
    NULL,
    COALESCE(
      (SELECT value #>> '{}' FROM public.settings WHERE key = 'tmpl_sms_rsvp_confirmation'),
      'Hi {{first_name}}, you''re confirmed for Matt & Raff''s wedding! See you there.'
    ),
    'event',
    TRUE,
    'sms'
  ),
  (
    'pre_wedding',
    'pre_wedding',
    NULL,
    'Hi {{first_name}}, almost time! Final details for Matt & Raff''s wedding:',
    'phase',
    TRUE,
    'sms'
  ),
  (
    'thank_you',
    'thank_you',
    NULL,
    'Thank you so much, {{first_name}} — it meant the world having you celebrate with us.',
    'phase',
    TRUE,
    'sms'
  ),
  (
    'link_recovery',
    NULL,
    NULL,
    'Hi {{first_name}}, here''s your wedding invite link:',
    'event',
    TRUE,
    'sms'
  )
ON CONFLICT (key, channel) DO NOTHING;

-- The old tmpl_sms_* rows in settings are left in place (parked, unread by the
-- engine from now on) rather than deleted, per instruction.

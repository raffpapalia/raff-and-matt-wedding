-- Creates the email_templates table for Option A: DB-stored editable subject/body,
-- rendered into a code-owned branded wrapper at send time. This is additive and does
-- NOT touch the existing settings-based tmpl_* rows used by the Templates admin page —
-- those keep working untouched until that page is rewired in a later pass.
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  phase TEXT CHECK (phase IN ('save_the_date', 'invitation', 'pre_wedding', 'thank_you')),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('phase', 'manual', 'event')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_templates_phase ON public.email_templates(phase);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Admin-only content, same sensitivity level as communications.
CREATE POLICY "Enable read access for authenticated users" ON public.email_templates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.email_templates
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.email_templates
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the 7 templates. Where the existing settings-based editor already has wording
-- for save_the_date / rsvp_confirmation email subject+body, carry it over so nothing
-- typed there is lost; everything else gets sensible placeholder copy.
INSERT INTO public.email_templates (key, phase, subject, body, trigger_type, is_active)
VALUES
  (
    'save_the_date',
    'save_the_date',
    COALESCE(
      (SELECT value #>> '{}' FROM public.settings WHERE key = 'tmpl_email_save_the_date_subject'),
      'Save the Date — Matt & Raff are getting married!'
    ),
    COALESCE(
      (SELECT value #>> '{}' FROM public.settings WHERE key = 'tmpl_email_save_the_date_body'),
      E'Hi {{first_name}},\n\nWe''re so excited to share our big news — we''re getting married!\n\nDate: {{wedding_date}}\nVenue: {{venue}}\n\nSave the date and stay tuned for your official invitation.\n\nWith love,\nMatt & Raff'
    ),
    'phase',
    TRUE
  ),
  (
    'invitation',
    'invitation',
    'You''re Invited — Matt & Raff, {{wedding_date}}',
    E'Hi {{first_name}},\n\nThe day is almost here! We''re thrilled to formally invite you to celebrate our wedding.\n\nDate: {{wedding_date}}\nVenue: {{venue}}\n\nPlease RSVP using the link below so we can save your seat.\n\nWith love,\nMatt & Raff',
    'phase',
    TRUE
  ),
  (
    'rsvp_reminder',
    'invitation',
    'Don''t forget to RSVP — Matt & Raff',
    E'Hi {{first_name}},\n\nJust a friendly reminder to RSVP for our wedding on {{wedding_date}} at {{venue}}. We''d love to know if you can join us!\n\nWith love,\nMatt & Raff',
    'manual',
    TRUE
  ),
  (
    'rsvp_confirmation',
    'invitation',
    COALESCE(
      (SELECT value #>> '{}' FROM public.settings WHERE key = 'tmpl_email_rsvp_confirmation_subject'),
      'You''re confirmed for Matt & Raff''s wedding!'
    ),
    COALESCE(
      (SELECT value #>> '{}' FROM public.settings WHERE key = 'tmpl_email_rsvp_confirmation_body'),
      E'Hi {{first_name}},\n\nThank you for RSVPing — we''re so happy you''ll be joining us!\n\nDate: {{wedding_date}}\nVenue: {{venue}}\n\nWe''ll be in touch with more details as the big day approaches.\n\nWith love,\nMatt & Raff'
    ),
    'event',
    TRUE
  ),
  (
    'pre_wedding',
    'pre_wedding',
    'Almost time! Final details for {{wedding_date}}',
    E'Hi {{first_name}},\n\nWe''re counting down the days! Here''s everything you need to know before the big day.\n\nDate: {{wedding_date}}\nVenue: {{venue}}\n\nSee you soon,\nMatt & Raff',
    'phase',
    TRUE
  ),
  (
    'thank_you',
    'thank_you',
    'Thank you, {{first_name}}!',
    E'Hi {{first_name}},\n\nThank you so much for celebrating our wedding with us — it meant the world to have you there.\n\nWith all our love,\nMatt & Raff',
    'phase',
    TRUE
  ),
  (
    'link_recovery',
    NULL,
    'Here''s your invitation link',
    E'Hi {{first_name}},\n\nLooking for your invitation? Here''s your personal link to RSVP and view all the details for Matt & Raff''s wedding.\n\nSee you there,\nMatt & Raff',
    'event',
    TRUE
  )
ON CONFLICT (key) DO NOTHING;

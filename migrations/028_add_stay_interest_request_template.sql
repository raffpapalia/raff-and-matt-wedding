-- Adds the 'stay_interest_request' email + SMS templates: the initial ask for
-- the QT room block expression of interest (/invite/[slug]/stay, migration 027).
-- Mirrors rsvp_reminder: trigger_type 'manual' (sent from the Comms dashboard
-- when the couple chooses), but phase NULL like link_recovery, since the
-- request isn't tied to a wedding phase.
--
-- {{stay_button}} renders as a "Register interest" button linking to the
-- household's stay page. In the SMS, {{stay_link}} is the /i/<code>/stay short
-- link and replaces the invite link that is normally appended.
INSERT INTO public.email_templates (key, phase, subject, body, trigger_type, is_active, channel)
VALUES
  (
    'stay_interest_request',
    NULL,
    'Staying at QT? A quick question',
    E'Hi {{first_name}},\n\nWe''re working on a group room rate at {{venue}} for the wedding, and it would really help to know roughly who''s keen to stay.\n\nIt''s just a quick headcount, not a booking. Let us know if you''d likely stay, which nights and how many rooms. It takes about 30 seconds.\n\n{{stay_button}}\n\nYou''ll confirm your actual room later, when you RSVP.\n\nWith love,\nMatt & Raff',
    'manual',
    TRUE,
    'email'
  ),
  (
    'stay_interest_request',
    NULL,
    NULL,
    'Hi {{first_name}}, staying at QT for Matt & Raff''s wedding? Quick no-commitment headcount for a group rate: {{stay_link}}',
    'manual',
    TRUE,
    'sms'
  )
ON CONFLICT (key, channel) DO NOTHING;

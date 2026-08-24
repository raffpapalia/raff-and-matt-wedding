-- Adds the 'registry_gift_confirmed' email template — sent to the giving
-- household's eligible guests the moment a registry gift is confirmed, either
-- by Stripe (card) or an admin marking a bank transfer as received. Mirrors
-- link_recovery: phase NULL (not tied to a wedding phase), trigger_type
-- 'event' (fired by a backend action, not a phase change or a manual click).
INSERT INTO public.email_templates (key, phase, subject, body, trigger_type, is_active, channel)
VALUES
  (
    'registry_gift_confirmed',
    NULL,
    'Thank you for your gift!',
    E'Hi {{first_name}},\n\nThank you so much for your gift toward {{gift_summary}} — it means the world to us.\n\nTotal: {{gift_total}}\n\nWith so much love,\nMatt & Raff',
    'event',
    TRUE,
    'email'
  )
ON CONFLICT (key, channel) DO NOTHING;

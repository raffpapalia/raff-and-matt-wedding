-- 022: Bank transfer details for guests whose bank doesn't support PayID.
--
-- registry_payid and registry_bank_* are independent and both optional — the
-- guest-facing confirmation shows whichever ones are configured. See
-- migration 021 for the rest of the registry settings.

INSERT INTO public.settings (key, value, updated_at) VALUES
  ('registry_bank_bsb', '""', now()),
  ('registry_bank_account_number', '""', now()),
  ('registry_bank_account_name', '""', now())
ON CONFLICT (key) DO NOTHING;

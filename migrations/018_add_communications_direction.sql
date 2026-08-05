-- Track inbound vs outbound communications, and whether an inbound message has
-- been reviewed in the admin Inbox. Also add a partial unique index on
-- provider_message_id so both the Twilio and Resend webhooks are idempotent
-- against provider retries (their IDs are globally unique; a duplicate
-- delivery just no-ops on insert/lookup instead of creating a second row).
ALTER TABLE public.communications
  ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound', 'inbound')),
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_communications_provider_message_id
  ON public.communications(provider_message_id) WHERE provider_message_id IS NOT NULL;

-- An inbound message from an unrecognised number still needs to be logged
-- (visible in the Inbox as "Unknown number") even though it can't be
-- attributed to a household. Existing reads already null-guard household_id
-- (e.g. LogClient's `row.households?.name ?? 'Unknown'`), so this is safe.
ALTER TABLE public.communications ALTER COLUMN household_id DROP NOT NULL;

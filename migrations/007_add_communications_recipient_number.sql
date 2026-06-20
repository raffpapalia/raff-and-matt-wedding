-- Documents the recipient_number column that already exists on the live database
-- (mirrors recipient_email from 002_add_comms_send_columns.sql). IF NOT EXISTS makes
-- this a safe no-op against the current schema, same pattern as 003's guest_id column.
ALTER TABLE public.communications
  ADD COLUMN IF NOT EXISTS recipient_number TEXT;

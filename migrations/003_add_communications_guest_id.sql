-- Documents the guest_id column that already exists on the live database.
-- IF NOT EXISTS makes this a safe no-op against the current schema.
ALTER TABLE public.communications
  ADD COLUMN IF NOT EXISTS guest_id uuid REFERENCES guests(id);

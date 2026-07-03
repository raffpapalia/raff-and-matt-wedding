-- communications.guest_id previously had no ON DELETE behavior, which meant
-- deleting a guest with logged communications failed with a foreign key
-- violation. The admin household editor swallowed that error and re-inserted
-- guests anyway, producing duplicate guest rows (e.g. the Harney household).
-- Deleting a guest should not be blocked by their communications history —
-- null out the reference instead, keeping the communications row (and its
-- household_id) for the record.
ALTER TABLE public.communications
  DROP CONSTRAINT IF EXISTS communications_guest_id_fkey;

ALTER TABLE public.communications
  ADD CONSTRAINT communications_guest_id_fkey
  FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE SET NULL;

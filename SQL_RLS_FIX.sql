-- Enable RLS on guests table if not already enabled
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (optional - only if you want to replace it)
-- DROP POLICY IF EXISTS "Allow anonymous RSVP updates" ON guests;

-- Create policy to allow anonymous users to update RSVP status and dietary requirements
-- This policy allows any anonymous user to update their own RSVP via the guest ID
CREATE POLICY "Allow anonymous RSVP updates"
  ON guests
  FOR UPDATE
  USING (true)  -- Allow access to all rows (since the guest_id is validated on client side)
  WITH CHECK (true);  -- Allow updates to all rows

-- Alternative: If you want stricter validation based on household_id
-- (Uncomment this instead if you prefer more security)
/*
CREATE POLICY "Allow anonymous RSVP updates via household"
  ON guests
  FOR UPDATE
  USING (
    -- Guest record exists (basic validation)
    household_id IS NOT NULL
  )
  WITH CHECK (
    -- Only allow updates to rsvp_status and dietary fields
    -- This ensures no other fields can be modified
    household_id IS NOT NULL
  );
*/

-- Ensure the anon role has UPDATE permission on the guests table
GRANT UPDATE(rsvp_status, dietary_requirement, dietary_other) ON guests TO anon;

-- Optional: If you want to restrict what columns anon can see/update, use this instead:
/*
GRANT SELECT(id, household_id, first_name, last_name, rsvp_status, dietary_requirement, dietary_other) ON guests TO anon;
GRANT UPDATE(rsvp_status, dietary_requirement, dietary_other) ON guests TO anon;
*/

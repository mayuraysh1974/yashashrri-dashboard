-- Migrate tests table to support multiple standards
ALTER TABLE tests ADD COLUMN standards TEXT[];

-- Move data if any exists (though it was just created)
UPDATE tests SET standards = ARRAY[standard];

-- Drop the old single standard column
ALTER TABLE tests DROP COLUMN standard;

-- Ensure RLS policies are still valid (they use 'standard'? No, they usually just check 'true' for public read)
-- Re-check policies in marks_solutions_setup.sql:
-- CREATE POLICY "Allow public read on tests" ON tests FOR SELECT TO public USING (true);
-- These are fine.

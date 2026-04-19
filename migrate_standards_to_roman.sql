-- Update standards to Roman numerals
UPDATE standards SET standard = 'VIII' WHERE standard ILIKE '%8th%';
UPDATE standards SET standard = 'IX' WHERE standard ILIKE '%9th%';
UPDATE standards SET standard = 'X' WHERE standard ILIKE '%10th%';
UPDATE standards SET standard = 'XI' WHERE standard ILIKE '%11th%';
UPDATE standards SET standard = 'XII' WHERE standard ILIKE '%12th%';

-- Also update existing students to maintain consistency
UPDATE students SET standard = 'VIII' WHERE standard ILIKE '%8th%';
UPDATE students SET standard = 'IX' WHERE standard ILIKE '%9th%';
UPDATE students SET standard = 'X' WHERE standard ILIKE '%10th%';
UPDATE students SET standard = 'XI' WHERE standard ILIKE '%11th%';
UPDATE students SET standard = 'XII' WHERE standard ILIKE '%12th%';

-- Also update existing enquiries/admissions
UPDATE online_admissions SET standard = 'VIII' WHERE standard ILIKE '%8th%';
UPDATE online_admissions SET standard = 'IX' WHERE standard ILIKE '%9th%';
UPDATE online_admissions SET standard = 'X' WHERE standard ILIKE '%10th%';
UPDATE online_admissions SET standard = 'XI' WHERE standard ILIKE '%11th%';
UPDATE online_admissions SET standard = 'XII' WHERE standard ILIKE '%12th%';

-- Add status column to online_admissions if missing
ALTER TABLE online_admissions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending';

-- Also update existing library resources
UPDATE library_resources SET standard = 'VIII' WHERE standard ILIKE '%8th%';
UPDATE library_resources SET standard = 'IX' WHERE standard ILIKE '%9th%';
UPDATE library_resources SET standard = 'X' WHERE standard ILIKE '%10th%';
UPDATE library_resources SET standard = 'XI' WHERE standard ILIKE '%11th%';
UPDATE library_resources SET standard = 'XII' WHERE standard ILIKE '%12th%';

-- Also update existing tests
UPDATE tests SET standard = 'VIII' WHERE standard ILIKE '%8th%';
UPDATE tests SET standard = 'IX' WHERE standard ILIKE '%9th%';
UPDATE tests SET standard = 'X' WHERE standard ILIKE '%10th%';
UPDATE tests SET standard = 'XI' WHERE standard ILIKE '%11th%';
UPDATE tests SET standard = 'XII' WHERE standard ILIKE '%12th%';

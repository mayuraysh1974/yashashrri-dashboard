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

-- Upgrade students table for Portal Access
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS portal_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS portal_password TEXT DEFAULT 'yash123';

-- Update existing students to have portal enabled if they don't already
UPDATE students SET portal_enabled = true WHERE portal_enabled IS NULL;
UPDATE students SET portal_password = 'yash123' WHERE portal_password IS NULL;

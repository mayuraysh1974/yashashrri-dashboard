-- Add marksheet_url column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS marksheet_url TEXT;

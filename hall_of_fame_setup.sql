-- SQL script to create the Hall of Fame table in Supabase

CREATE TABLE IF NOT EXISTS hall_of_fame (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name TEXT NOT NULL,
  percentage TEXT,
  marks TEXT,
  stream TEXT NOT NULL,
  rank TEXT NOT NULL,
  year TEXT NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE hall_of_fame ENABLE ROW LEVEL SECURITY;

-- If your React app queries Supabase without a logged-in user (using the anon key), 
-- you must create PUBLIC policies so the app can read, insert, and delete records.
-- IMPORTANT: Adjust these according to your exact security requirements.

CREATE POLICY "Allow public read access to hall of fame" 
ON hall_of_fame FOR SELECT 
TO public 
USING (true);

CREATE POLICY "Allow public inserts to hall of fame" 
ON hall_of_fame FOR INSERT 
TO public 
WITH CHECK (true);

CREATE POLICY "Allow public deletes to hall of fame" 
ON hall_of_fame FOR DELETE 
TO public 
USING (true);

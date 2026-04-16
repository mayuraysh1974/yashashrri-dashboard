-- ==========================================
-- 5. TESTS & SOLUTIONS
-- ==========================================

-- Ensure tests table exists with solution_url
CREATE TABLE IF NOT EXISTS tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  standard TEXT NOT NULL,
  total_marks NUMERIC NOT NULL,
  date DATE NOT NULL,
  solution_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure test_results table exists
CREATE TABLE IF NOT EXISTS test_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
  student_id UUID NOT NULL, -- Assuming UUID from students table
  score NUMERIC NOT NULL,
  UNIQUE(test_id, student_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

-- Allow public to select tests (to see names/dates/solutions)
CREATE POLICY "Allow public read on tests" 
ON tests FOR SELECT 
TO public 
USING (true);

-- Allow authenticated users (Admins) full access
CREATE POLICY "Allow authenticated full access on tests" 
ON tests FOR ALL 
TO authenticated 
USING (true);

-- Allow public to read results (filtered by student_id in the app)
-- We might want to restrict this further, but for a simple "Check Results" page, 
-- we will filter based on the ID we fetch from the students table.
CREATE POLICY "Allow public read on test_results" 
ON test_results FOR SELECT 
TO public 
USING (true);

-- Allow authenticated users (Admins) full access
CREATE POLICY "Allow authenticated full access on test_results" 
ON test_results FOR ALL 
TO authenticated 
USING (true);

-- NOTE: Ensure you create a bucket named 'solutions' in Supabase Storage and make it public.

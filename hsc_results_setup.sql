-- ==========================================
-- HSC RESULTS (HALL OF FAME) TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS hsc_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name TEXT NOT NULL,
  percentage TEXT NOT NULL,
  subject_scores TEXT,
  rank_tag TEXT,
  photo_url TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE hsc_results ENABLE ROW LEVEL SECURITY;

-- Allow public to view results
CREATE POLICY "Allow public read on hsc_results" 
ON hsc_results FOR SELECT 
TO public 
USING (true);

-- Allow authenticated users (Admins) to manage results
CREATE POLICY "Allow authenticated full access on hsc_results" 
ON hsc_results FOR ALL 
TO authenticated 
USING (true);

-- Insert Initial Data (The 4 toppers we created)
-- Note: Replace photo_urls with actual Supabase Storage URLs once uploaded
INSERT INTO hsc_results (student_name, percentage, subject_scores, rank_tag, photo_url, display_order)
VALUES 
('Siddharth More', '95.83%', 'Maths: 100/100, Physics: 98/100', 'Institute Rank 1', '/topper1.png', 1),
('Ananya Deshmukh', '94.50%', 'Biology: 97/100, Chemistry: 95/100', 'Distinction', '/topper2.png', 2),
('Varun Patil', '92.17%', 'Maths: 99/100, CS: 96/100', 'Distinction', '/topper3.png', 3),
('Ishita Kulkarni', '91.50%', 'Physics: 96/100, Chemistry: 94/100', 'Distinction', '/topper4.png', 4);

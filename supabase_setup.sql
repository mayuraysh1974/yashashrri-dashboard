-- Supabase SQL Editor Script
-- Run this script in your Supabase SQL Editor (SQL Editor -> New Query) to fully secure your database and create the required tables.

-- SECURITY EXPLANATION:
-- Your Supabase database is "fully secured" when Row Level Security (RLS) is enabled on all tables.
-- By default, when you create a table, RLS is disabled, meaning anyone with your ANON_KEY can read/write data.
-- Enabling RLS and explicitly defining policies ensures that:
-- 1. Unauthenticated users (public) can only do what you allow them to (e.g., submit an enquiry, view the gallery).
-- 2. Authenticated users (admins) can view, edit, and delete records.

-- ==========================================
-- 1. ENQUIRIES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS enquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name TEXT NOT NULL,
  standard TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'New',
  reply_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;

-- Allow anyone to Insert an enquiry (Public Website form)
CREATE POLICY "Allow public inserts on enquiries" 
ON enquiries FOR INSERT 
TO public 
WITH CHECK (true);

-- Allow only authenticated users (Admins) to read/update/delete enquiries
CREATE POLICY "Allow authenticated full access on enquiries" 
ON enquiries FOR ALL 
TO authenticated 
USING (true);


-- ==========================================
-- 2. ADMISSIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS online_admissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  standard TEXT NOT NULL,
  gender TEXT,
  dob DATE,
  address TEXT,
  status TEXT DEFAULT 'Pending Review',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE online_admissions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to Insert an admission form
CREATE POLICY "Allow public inserts on online_admissions" 
ON online_admissions FOR INSERT 
TO public 
WITH CHECK (true);

-- Allow only authenticated users to manage admissions
CREATE POLICY "Allow authenticated full access on online_admissions" 
ON online_admissions FOR ALL 
TO authenticated 
USING (true);


-- ==========================================
-- 3. ONLINE PAYMENTS LOG TABLE
-- ==========================================
-- NOTE: For actual payment processing, you would integrate Razorpay or Stripe. 
-- This table is to log payment submissions declared by students.
CREATE TABLE IF NOT EXISTS online_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  transaction_id TEXT NOT NULL,
  status TEXT DEFAULT 'Pending Verification',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE online_payments ENABLE ROW LEVEL SECURITY;

-- Allow public to submit payment transaction details
CREATE POLICY "Allow public inserts on online_payments" 
ON online_payments FOR INSERT 
TO public 
WITH CHECK (true);

-- Allow authenticated users to view & update payment details
CREATE POLICY "Allow authenticated full access on online_payments" 
ON online_payments FOR ALL 
TO authenticated 
USING (true);


-- ==========================================
-- 4. GALLERY TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS gallery_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('photo', 'video')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE gallery_items ENABLE ROW LEVEL SECURITY;

-- Allow public to just View gallery items
CREATE POLICY "Allow public read on gallery_items" 
ON gallery_items FOR SELECT 
TO public 
USING (true);

-- Allow authenticated users to insert/update/delete gallery items
CREATE POLICY "Allow authenticated full access on gallery_items" 
ON gallery_items FOR ALL 
TO authenticated 
USING (true);


-- NOTE: Also ensure you have configured a Supabase Storage Bucket named 'gallery' for uploading photos!
-- Storage bucket policies must also be configured in Supabase Storage dashboard:
-- 1. Create a bucket named "gallery" and make it PUBLIC.
-- 2. Add an RLS policy on the bucket to allow INSERT/UPDATE/DELETE for authenticated users only.

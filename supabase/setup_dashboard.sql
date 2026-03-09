-- AI Cinema Studio: Dashboard Setup Script
-- This script sets up the 'assets' table and storage bucket permissions.

-- 1. Create the assets table
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'video' CHECK (type IN ('video', 'image')),
    path TEXT NOT NULL -- The path to the file in Supabase Storage
);

-- 2. Enable Row Level Security
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies
-- Allow anyone to read assets
CREATE POLICY "Public Read Access" 
ON public.assets FOR SELECT 
USING (true);

-- Allow authenticated users to insert assets
CREATE POLICY "Authenticated Insert" 
ON public.assets FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- 4. Storage Bucket Setup Instructions
-- Note: You should manually create a public bucket named 'assets' in the Supabase Dashboard.
-- Or run these commands if your Supabase version supports it:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('assets', 'assets', true);

-- Add Storage Policies (if not done via UI)
-- CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'assets');
-- CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'assets' AND auth.role() = 'authenticated');

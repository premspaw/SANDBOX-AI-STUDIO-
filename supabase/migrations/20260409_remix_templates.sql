-- Table for 9:16 Vertical Video Remix Templates
CREATE TABLE IF NOT EXISTS public.remix_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  video_url text NOT NULL,
  thumbnail_url text,
  prompt text NOT NULL,
  category text NOT NULL DEFAULT 'trending',
  aspect_ratio text NOT NULL DEFAULT '9:16',
  remix_count integer DEFAULT 0,
  created_by text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.remix_templates ENABLE ROW LEVEL SECURITY;

-- Allow anyone (public / authenticated) to read templates
CREATE POLICY "Remix templates are viewable by everyone"
  ON public.remix_templates FOR SELECT
  USING (true);

-- Allow authenticated users / admin to insert templates
CREATE POLICY "Users and admins can insert templates"
  ON public.remix_templates FOR INSERT
  WITH CHECK (true);

-- Allow admins to update or delete templates
CREATE POLICY "Admins can update templates"
  ON public.remix_templates FOR UPDATE
  USING (true);

CREATE POLICY "Admins can delete templates"
  ON public.remix_templates FOR DELETE
  USING (true);

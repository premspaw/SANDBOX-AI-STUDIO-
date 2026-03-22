-- Migration: Create Landing Video Assets Table
-- Description: Stores inventory of videos/images specifically for the landing page.

CREATE TABLE IF NOT EXISTS public.landing_video_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    title TEXT,
    category TEXT CHECK (category IN ('hero', 'pipeline', 'gallery', 'product', 'ugc', 'cinema')),
    meta JSONB DEFAULT '{}'::jsonb,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.landing_video_assets ENABLE ROW LEVEL SECURITY;

-- Allow public read (for landing page)
CREATE POLICY "Allow public read access" ON public.landing_video_assets
    FOR SELECT USING (true);

-- Allow service role / admin full access
-- Note: Assuming admin users are handled via standard Supabase auth or service role.
CREATE POLICY "Allow service role full access" ON public.landing_video_assets
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

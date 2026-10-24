-- ─────────────────────────────────────────────────────────────
-- ZeroLens Reels Editor Tables & RLS Policies
-- ─────────────────────────────────────────────────────────────

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS public.reels_projects (
  id text PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Untitled reel',
  revision integer NOT NULL DEFAULT 0,
  project_data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Project Revisions History Table
CREATE TABLE IF NOT EXISTS public.reels_revisions (
  project_id text NOT NULL REFERENCES public.reels_projects(id) ON DELETE CASCADE,
  revision integer NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (project_id, revision)
);

-- 3. Render and Analysis Jobs Table
CREATE TABLE IF NOT EXISTS public.reels_jobs (
  id text PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id text NOT NULL REFERENCES public.reels_projects(id) ON DELETE CASCADE,
  revision integer NOT NULL,
  type text NOT NULL, -- 'render' | 'silence'
  status text NOT NULL DEFAULT 'queued', -- 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
  stage text NOT NULL DEFAULT 'queued',
  progress double precision,
  error text,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  snapshot jsonb NOT NULL,
  output jsonb,
  result jsonb,
  metrics jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  started_at timestamp with time zone,
  finished_at timestamp with time zone
);

-- Enable Row Level Security (Tenant Isolation)
ALTER TABLE public.reels_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reels_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reels_jobs ENABLE ROW LEVEL SECURITY;

-- Project Policies
CREATE POLICY "Users can only read own reels projects"
  ON public.reels_projects FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can only insert own reels projects"
  ON public.reels_projects FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can only update own reels projects"
  ON public.reels_projects FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can only delete own reels projects"
  ON public.reels_projects FOR DELETE
  USING (auth.uid() = owner_id);

-- Revision Policies
CREATE POLICY "Users can only read own reels revisions"
  ON public.reels_revisions FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can only insert own reels revisions"
  ON public.reels_revisions FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Jobs Policies
CREATE POLICY "Users can only read own reels jobs"
  ON public.reels_jobs FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can only insert own reels jobs"
  ON public.reels_jobs FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can only update own reels jobs"
  ON public.reels_jobs FOR UPDATE
  USING (auth.uid() = owner_id);

-- Table for UGC Scene Templates
CREATE TABLE IF NOT EXISTS public.ugc_scene_templates (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  scene_context text,
  prompt text not null,
  img text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security
ALTER TABLE public.ugc_scene_templates ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read the templates
CREATE POLICY "Templates are viewable by everyone."
  ON public.ugc_scene_templates FOR SELECT
  USING (true);

-- Allow authenticated users to insert/update/delete their templates
-- For this scenario we permit any auth user to insert and delete
CREATE POLICY "Users can insert templates."
  ON public.ugc_scene_templates FOR INSERT
  WITH CHECK (auth.uid() is not null);

CREATE POLICY "Users can delete templates."
  ON public.ugc_scene_templates FOR DELETE
  USING (true); -- Allow deletion if they want it global, or limit to authenticated

-- Migration: Extend assets table for Avatar Studio character saves
-- Adds missing columns and updates the type CHECK to include 'character'
-- Safe to run multiple times (IF NOT EXISTS / DROP CONSTRAINT IF EXISTS pattern)

-- 0. Create avatar_generations table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS public.avatar_generations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT,
    character_name TEXT,
    style TEXT,
    ref_image_url TEXT,
    output_url TEXT,
    prompt TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.avatar_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own generations" ON public.avatar_generations;
CREATE POLICY "Users see own generations"
    ON public.avatar_generations FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own generations" ON public.avatar_generations;
CREATE POLICY "Users insert own generations"
    ON public.avatar_generations FOR INSERT
    WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users delete own generations" ON public.avatar_generations;
CREATE POLICY "Users delete own generations"
    ON public.avatar_generations FOR DELETE
    USING (auth.uid() = user_id);

-- 1. Add user_id if missing
ALTER TABLE public.assets
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Add url column if missing (maps to file path / CDN URL)
ALTER TABLE public.assets
    ADD COLUMN IF NOT EXISTS url TEXT;

-- 3. Add metadata JSONB column if missing
ALTER TABLE public.assets
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 4. Widen the type CHECK to include 'character'
--    Step A: Drop the old constraint
ALTER TABLE public.assets
    DROP CONSTRAINT IF EXISTS assets_type_check;

--    Step B: Normalize any existing rows that have types outside the new allowed list
--    (e.g. NULL or old values) to 'image' so the new constraint doesn't reject them
UPDATE public.assets
    SET type = 'image'
    WHERE type IS NULL
       OR type NOT IN ('video', 'image', 'character', 'upscaled');

--    Step C: Add the new constraint with NOT VALID so it only checks future inserts
--    (existing rows are grandfathered in after the UPDATE above)
ALTER TABLE public.assets
    ADD CONSTRAINT assets_type_check
    CHECK (type IN ('video', 'image', 'character', 'upscaled'))
    NOT VALID;

--    Step D: Validate the constraint now that rows are clean
ALTER TABLE public.assets
    VALIDATE CONSTRAINT assets_type_check;

-- 5. Ensure authenticated users can insert their own character rows
DROP POLICY IF EXISTS "Authenticated Insert" ON public.assets;

CREATE POLICY "Authenticated Insert"
    ON public.assets FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- 6. Allow users to delete their own assets
DROP POLICY IF EXISTS "Owner Delete" ON public.assets;

CREATE POLICY "Owner Delete"
    ON public.assets FOR DELETE
    USING (auth.uid() = user_id);

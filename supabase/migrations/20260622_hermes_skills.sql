-- Migration: Create Hermes Admin Skills Table
-- Allows admins to inject custom storytelling scripts and reel writing instructions into Hermes system prompts.

CREATE TABLE IF NOT EXISTS public.hermes_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    system_instructions TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.hermes_skills ENABLE ROW LEVEL SECURITY;

-- Policies: Viewable by authenticated users (so backend/users can read them)
CREATE POLICY "Allow public read access to active skills" 
    ON public.hermes_skills 
    FOR SELECT 
    TO public 
    USING (is_active = TRUE);

-- Insert 2 default expert admin skills: one for Storytelling Scripts, one for Reel Writing Formulas
INSERT INTO public.hermes_skills (name, description, system_instructions) VALUES
('Storytelling Scriptwriter', 
 'Expert story framework (Hook, Conflict, Resolution, Call-To-Action) to make carousels narrative-rich and emotionally resonant.', 
 'STORYTELLING SCRIPTWRITING SKILL:
When the user wants storytelling scripts:
1. Apply the Hero''s Journey or narrative story arcs (Hook, Inciting Incident, Rising Action, Climax, Resolution).
2. The Hook slide must capture curiosity within 3 seconds using a visual question or shocking statistic.
3. Keep sentences conversational, with alternating lengths to create narrative rhythm.
4. Structure the middle slides to build emotional stakes, leading to a satisfying climax and resolving CTA.
5. In your response content, pitch a concrete visual storyboard concept matching the story.'),

('Viral Instagram Reels Formula', 
 'Hook-driven, fast-paced copywriting style optimized for retention, transition cues, and high engagement on short-form videos/reels.', 
 'VIRAL REELS WRITING SKILL:
When the user wants to write a Reel script:
1. Structure for absolute maximum watch-time retention: Hook (0-3s), Core Value (3-12s), CTA (12-15s).
2. Proactively suggest text-on-screen overlays, audio/SFX cues, and visual b-roll transitions (e.g. "[Visual: Zoom in on hands holding product, SFX: Pop sound]").
3. Keep the voice raw, high-energy, and direct (use "you" and "I").
4. Design loopable script endings (where the last line flows seamlessly back into the hook).')
ON CONFLICT (name) DO UPDATE 
SET system_instructions = EXCLUDED.system_instructions,
    description = EXCLUDED.description;

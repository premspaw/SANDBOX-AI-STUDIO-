-- 1. Create the camera_angles table
CREATE TABLE IF NOT EXISTS public.camera_angles (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    gcs_uri TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.camera_angles ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies
CREATE POLICY "Public Read Access" ON public.camera_angles FOR SELECT USING (true);
CREATE POLICY "Public Insert/Update" ON public.camera_angles FOR ALL USING (true); -- Note: Simplified for the demo, restrict in production

-- 4. Seed with defaults
INSERT INTO public.camera_angles (id, label, description, image_url)
VALUES 
    ('extreme_wide', 'Extreme Wide', 'Vast landscape', '/assets/angle_wide.png'),
    ('wide', 'Wide Shot', 'Full scene', '/assets/angle_wide.png'),
    ('medium', 'Medium Shot', 'Waist up', '/assets/angle_closeup.png'),
    ('closeup', 'Close Up', 'Face details', '/assets/angle_closeup.png'),
    ('extreme_closeup', 'Extreme Close', 'Eye/Detail', '/assets/angle_closeup.png'),
    ('low_angle', 'Low Angle', 'Looking up', '/assets/angle_low.png'),
    ('high_angle', 'High Angle', 'Looking down', '/assets/angle_drone.png'),
    ('drone', 'Drone View', 'Aerial', '/assets/angle_drone.png'),
    ('pov', 'POV', 'First person', '/assets/angle_pov.png'),
    ('dutch', 'Dutch Angle', 'Tilted', '/assets/angle_low.png'),
    ('ots', 'Over Shoulder', 'Behind subject', '/assets/angle_pov.png')
ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description;

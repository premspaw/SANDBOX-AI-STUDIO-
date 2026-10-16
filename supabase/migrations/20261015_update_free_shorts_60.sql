-- Update default shorts_balance for new signups to 60 (50 for 1 full Video + 10 for Images)
ALTER TABLE public.profiles ALTER COLUMN shorts_balance SET DEFAULT 60;

-- Ensure auth trigger (if any) sets 60 credits on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    shorts_balance,
    tier,
    brand_voice,
    updated_at
  )
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    60,
    'FREE',
    jsonb_build_object(
      'free_tier', true,
      'free_video_credits', 50,
      'free_image_credits', 10,
      'free_gpt_images_used', 0,
      'max_free_gpt_images', 2
    ),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-bind trigger if auth.users trigger exists or is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

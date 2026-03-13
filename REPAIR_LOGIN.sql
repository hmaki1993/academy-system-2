-- ========================================================
-- EMERGENCY LOGIN & PROFILE REPAIR SCRIPT
-- ========================================================
-- This script ensures all users in Auth have a corresponding 
-- profile and that the system is ready for the first login.
-- ========================================================

-- [1] Fix the Profile Trigger one more time (Safety First)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'admin'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- [2] Backfill any missing profiles (If you created a user and it failed to create a profile)
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)), 
    'admin'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- [3] Ensure Gym Settings row exists (Crucial for App Loading)
INSERT INTO public.gym_settings (id, gym_name, academy_name)
SELECT gen_random_uuid(), 'Gymnastic System 2', 'Gymnastic System 2'
WHERE NOT EXISTS (SELECT 1 FROM public.gym_settings)
ON CONFLICT DO NOTHING;

-- [4] Reset RLS for Profiles to be super safe during first setup
DROP POLICY IF EXISTS "Profiles readable by authenticated" ON public.profiles;
CREATE POLICY "Profiles readable by authenticated" ON public.profiles 
FOR SELECT USING (true); -- Allow all users to see profiles for now

-- [5] Verification Query (Run this and check the results)
SELECT 'Profiles Found' as check_type, count(*) FROM public.profiles
UNION ALL
SELECT 'Auth Users Found', count(*) FROM auth.users
UNION ALL
SELECT 'Settings Found', count(*) FROM public.gym_settings;

-- FIX DEMO DATABASE AUTHENTICATION
-- This script ensures that user registration and login work properly

-- 1. Drop existing trigger and function if they exist (to recreate them fresh)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Create the trigger function to auto-create profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'coach'::user_role)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Fix any existing users without profiles
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', 'User'),
  COALESCE((u.raw_user_meta_data->>'role')::user_role, 'coach'::user_role)
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 5. Verify the fix
SELECT 
  'Users without profiles' as check_type,
  COUNT(*) as count
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL

UNION ALL

SELECT 
  'Total users' as check_type,
  COUNT(*) as count
FROM auth.users

UNION ALL

SELECT 
  'Total profiles' as check_type,
  COUNT(*) as count
FROM public.profiles;

-- 6. Show all users and their profiles
SELECT 
  u.email,
  p.full_name,
  p.role,
  CASE WHEN p.id IS NULL THEN '❌ Missing Profile' ELSE '✅ Has Profile' END as status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC;

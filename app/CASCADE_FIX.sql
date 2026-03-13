-- 🌊 THE CASCADE CLEANUP (V1)
-- Run this in your Supabase SQL Editor to allow smooth account deletion.

BEGIN;

-- 1. FIX ATTENDANCE LINKAGE
ALTER TABLE IF EXISTS public.coach_attendance 
DROP CONSTRAINT IF EXISTS coach_attendance_coach_id_fkey;

ALTER TABLE public.coach_attendance 
ADD CONSTRAINT coach_attendance_coach_id_fkey 
FOREIGN KEY (coach_id) 
REFERENCES public.coaches(id) 
ON DELETE CASCADE;

-- 2. FIX COACH -> PROFILE LINKAGE
ALTER TABLE IF EXISTS public.coaches 
DROP CONSTRAINT IF EXISTS coaches_profile_id_fkey;

ALTER TABLE public.coaches 
ADD CONSTRAINT coaches_profile_id_fkey 
FOREIGN KEY (profile_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- 3. FIX PROFILES -> AUTH.USERS LINKAGE
-- Most Supabase setups already have this, but let's be sure.
-- Note: Profiles is usually linked to auth.users by ID.
ALTER TABLE IF EXISTS public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

COMMIT;

SELECT 'SUCCESS: All staff relationships are now set to CASCADE. Deletion will be smooth.' as status;

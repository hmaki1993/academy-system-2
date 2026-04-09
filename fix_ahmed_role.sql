-- ====================================================
-- TARGETED FIX: Fix Ahmed's role from 'coach' to 'student'
-- and remove him from the coaches table
-- Run this in Supabase SQL Editor
-- ====================================================

-- Step 1: Fix Ahmed's profile role (change from 'coach' to 'student')
UPDATE public.profiles
SET role = 'student'
WHERE id = '51f2eeb5-f296-4eee-9d64-5fe0c40db823';

-- Step 2: Remove Ahmed from the coaches table (he is NOT a coach)
DELETE FROM public.coaches
WHERE profile_id = '51f2eeb5-f296-4eee-9d64-5fe0c40db823';

-- Verify: Check the result
SELECT s.full_name, s.profile_id, p.role
FROM public.students s
LEFT JOIN public.profiles p ON p.id = s.profile_id
WHERE s.profile_id IS NOT NULL;

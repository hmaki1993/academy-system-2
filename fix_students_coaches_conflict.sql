-- ====================================================
-- FIX: Remove student profiles from the coaches table
-- Run this in Supabase SQL Editor
-- ====================================================

-- Step 1: See who is wrongly in coaches AND students table
SELECT 
    s.full_name as student_name,
    s.profile_id,
    c.id as coach_id,
    p.role as profile_role
FROM public.students s
INNER JOIN public.coaches c ON c.profile_id = s.profile_id
LEFT JOIN public.profiles p ON p.id = s.profile_id
WHERE s.profile_id IS NOT NULL;

-- Step 2: Remove these from the coaches table
-- (Students should NOT be in the coaches table)
DELETE FROM public.coaches
WHERE profile_id IN (
    SELECT profile_id 
    FROM public.students 
    WHERE profile_id IS NOT NULL
    -- Safety: only remove if their profile role is 'student' or null
    -- Remove this AND clause if you want to remove all students from coaches
    AND profile_id IN (
        SELECT id FROM public.profiles 
        WHERE role NOT IN ('admin', 'coach', 'head_coach', 'reception', 'cleaner')
    )
);

-- Step 3: Make sure Ahmed (and all registered students) have role='student' in profiles
UPDATE public.profiles
SET role = 'student'
WHERE id IN (
    SELECT profile_id 
    FROM public.students 
    WHERE profile_id IS NOT NULL
)
AND role NOT IN ('admin', 'coach', 'head_coach', 'reception', 'cleaner');

-- Verify the fix
SELECT s.full_name, s.profile_id, p.role
FROM public.students s
LEFT JOIN public.profiles p ON p.id = s.profile_id
WHERE s.profile_id IS NOT NULL;

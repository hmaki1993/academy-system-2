-- DEBUG: Check Coach Profile Linking
-- This script helps identify why check-in is failing

-- 1. Get the current logged-in user's profile
SELECT 
    'Current User Auth' as check_type,
    u.id as auth_user_id,
    u.email,
    p.id as profile_id,
    p.role,
    p.full_name
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'mosa@maily.com' -- Replace with your coach email
ORDER BY u.created_at DESC;

-- 2. Check if this profile is linked to a coach record
SELECT 
    'Coach Record' as check_type,
    c.id as coach_id,
    c.profile_id,
    c.full_name,
    c.email,
    p.id as profile_exists
FROM public.coaches c
LEFT JOIN public.profiles p ON c.profile_id = p.id
WHERE c.email = 'mosa@maily.com' -- Replace with your coach email
   OR c.profile_id IN (
       SELECT id FROM public.profiles 
       WHERE email = 'mosa@maily.com'
   );

-- 3. Check for orphaned attendance records
SELECT 
    'Orphaned Attendance' as check_type,
    ca.*
FROM public.coach_attendance ca
WHERE ca.coach_id NOT IN (SELECT id FROM public.coaches);

-- 4. If coach record exists but profile_id is wrong, fix it
-- UNCOMMENT THE LINES BELOW AFTER CHECKING THE RESULTS ABOVE

-- UPDATE public.coaches c
-- SET profile_id = (
--     SELECT p.id 
--     FROM public.profiles p 
--     WHERE p.email = c.email 
--     LIMIT 1
-- )
-- WHERE c.email = 'mosa@maily.com'; -- Replace with your coach email

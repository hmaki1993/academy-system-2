-- VERIFY TRIGGERS AND ACCOUNT STATUS

-- 1. Check if the trigger is attached to auth.users
-- (We check via public schema proxy if possible, but usually we just trust the master script)

-- 2. Check for "Shadow Coaches" (Coaches with no Auth Link)
SELECT 
    'SHADOW COACH' as status,
    full_name,
    email,
    id as coach_record_id,
    profile_id
FROM public.coaches
WHERE profile_id IS NULL 
   OR profile_id NOT IN (SELECT id FROM public.profiles);

-- 3. Check for "Broken Profiles" (Profiles with no Coach record - except admins)
SELECT 
    'ORPHAN PROFILE' as status,
    email,
    full_name,
    role
FROM public.profiles
WHERE role = 'coach'
AND id NOT IN (SELECT profile_id FROM public.coaches WHERE profile_id IS NOT NULL);

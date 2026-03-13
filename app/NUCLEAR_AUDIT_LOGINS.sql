-- NUCLEAR AUDIT: FIND EVERY BREAK IN THE CHAIN

SELECT 
    c.email,
    c.full_name,
    c.id as coach_record_id,
    c.profile_id as linked_profile_id,
    p.id as actual_profile_id,
    p.email as profile_email,
    -- Check if linked_profile_id matches any ID in profiles
    EXISTS (SELECT 1 FROM public.profiles WHERE id = c.profile_id) as linked_id_exists_in_profiles,
    -- Check if email exists in profiles but with different ID
    (SELECT id FROM public.profiles WHERE email = c.email AND id != COALESCE(c.profile_id, '00000000-0000-0000-0000-000000000000'::uuid) LIMIT 1) as profile_id_conflict,
    -- Link to auth.users if we have permission (usually yes via SQL editor)
    (SELECT id FROM auth.users WHERE email = c.email LIMIT 1) as auth_user_id
FROM public.coaches c
LEFT JOIN public.profiles p ON c.profile_id = p.id
ORDER BY c.email;

-- List all coaches who have NO profile_id
SELECT 'NO LINK' as type, full_name, email FROM public.coaches WHERE profile_id IS NULL;

-- List all profiles that are marked 'coach' but not linked to any coach record
SELECT 'ABANDONED PROFILE' as type, email, full_name, id FROM public.profiles 
WHERE role = 'coach' 
AND id NOT IN (SELECT profile_id FROM public.coaches WHERE profile_id IS NOT NULL);

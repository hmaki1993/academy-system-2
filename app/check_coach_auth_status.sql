-- CHECK COACH LOGIN STATUS
-- Check which coaches have valid profiles and auth links

SELECT 
    c.email,
    c.full_name,
    c.id as coach_id,
    c.profile_id,
    p.id as profile_record_id,
    p.role as profile_role,
    CASE 
        WHEN p.id IS NOT NULL THEN '✅ Profile Exists'
        ELSE '❌ Missing Profile'
    END as profile_status,
    CASE 
        WHEN c.profile_id IS NOT NULL THEN '✅ Linked'
        ELSE '❌ Unlinked'
    END as linking_status
FROM public.coaches c
LEFT JOIN public.profiles p ON c.profile_id = p.id
ORDER BY c.email;

-- Check for orphaned profiles that might belong to coaches
SELECT 
    p.email,
    p.id as profile_id,
    p.role
FROM public.profiles p
WHERE p.role = 'coach'
AND p.id NOT IN (SELECT profile_id FROM public.coaches WHERE profile_id IS NOT NULL);

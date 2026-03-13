-- DIAGNOSE COACH AUTH ISSUES
-- Run this to see exactly what is wrong with the accounts.

SELECT 
    c.email,
    c.full_name,
    c.role as coach_role,
    p.role as profile_role,
    c.profile_id as coach_linked_id,
    u.id as auth_user_id,
    CASE WHEN u.id IS NULL THEN '❌ No Auth User' ELSE '✅ Auth User Exists' END as auth_status,
    CASE WHEN c.profile_id = u.id THEN '✅ Linked' ELSE '❌ Link Mismatch' END as link_status,
    CASE WHEN p.id IS NOT NULL THEN '✅ Profile Exists' ELSE '❌ Missing Profile' END as profile_status,
    u.email_confirmed_at,
    u.last_sign_in_at
FROM public.coaches c
LEFT JOIN auth.users u ON LOWER(c.email) = LOWER(u.email)
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY c.email;

-- Check if pgcrypto is installed
SELECT name, default_version, installed_version 
FROM pg_available_extensions 
WHERE name = 'pgcrypto';

-- Check user_role enum values
SELECT n.nspname as schema, t.typname as type, e.enumlabel as value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE t.typname = 'user_role';

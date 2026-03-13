-- AUTH STRUCTURE COMPARISON
-- Run this to find why legacy coaches can't log in.

-- 1. Check all columns for a working user vs a broken one
-- Note: Replace with actual emails found in your DB
SELECT 
    email,
    id,
    aud,
    role,
    email_confirmed_at,
    confirmed_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    instance_id,
    deleted_at
FROM auth.users
WHERE email LIKE '%@%' -- Shows all users
ORDER BY last_sign_in_at DESC NULLS LAST;

-- 2. Check if profiles match the auth IDs
SELECT 
    p.email as profile_email,
    p.id as profile_id,
    p.role as profile_role,
    u.id as auth_id,
    CASE WHEN u.id IS NULL THEN '❌ No Auth User' ELSE '✅ Linked' END as auth_status
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
ORDER BY p.email;

-- 3. Check if coaches match the profiles
SELECT 
    c.email as coach_email,
    c.id as coach_id,
    c.profile_id,
    p.id as profile_id_match,
    CASE WHEN p.id IS NOT NULL THEN '✅ Linked to Profile' ELSE '❌ Disconnected' END as linkage
FROM public.coaches c
LEFT JOIN public.profiles p ON c.profile_id = p.id
ORDER BY c.email;

-- 4. Check if pgcrypto is properly enabled
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';

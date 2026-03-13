-- DIAGNOSE AUTH STRUCTURE MISMATCH
-- Compare a working user (the Admin) with a broken legacy coach.

-- 1. Get raw structure of auth.users
SELECT 
    id, email, aud, role, 
    email_confirmed_at, 
    raw_app_meta_data, 
    raw_user_meta_data,
    is_super_admin,
    is_sso_user,
    deleted_at
FROM auth.users
WHERE email IN (
    'admin@epicgym.com', -- Example working admin email
    'admin@epic.com'     -- Alternate
) OR id IN (SELECT id FROM public.profiles WHERE role = 'admin');

-- 2. Get raw structure of auth.identities
SELECT 
    user_id, 
    provider, 
    provider_id, 
    identity_data
FROM auth.identities
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email IN ('admin@epicgym.com', 'admin@epic.com')
    OR id IN (SELECT id FROM public.profiles WHERE role = 'admin')
);

-- 3. Check for specific coach
-- (User should replace with a specific failing email)
SELECT * FROM auth.users WHERE email LIKE '%coach%';

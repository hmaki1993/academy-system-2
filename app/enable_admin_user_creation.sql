-- ENABLE AUTOMATIC USER CREATION FOR ADMINS
-- This script creates a secure function to allow Admins to create new users (Changes in auth.users) from the frontend.

-- 1. Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Drop existing function if any
DROP FUNCTION IF EXISTS public.create_new_user(text, text, jsonb);

-- 3. Create the simplified user creation function
CREATE OR REPLACE FUNCTION public.create_new_user(
    email text,
    password text,
    user_metadata jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with superuser privileges (required to write to auth.users)
SET search_path = public, auth, extensions -- Secure search path
AS $$
DECLARE
    new_user_id uuid;
    encrypted_pw text;
BEGIN
    -- Check if user already exists
    IF EXISTS (SELECT 1 FROM auth.users WHERE auth.users.email = create_new_user.email) THEN
        RAISE EXCEPTION 'User with this email already exists';
    END IF;

    -- Generate ID and Hash Password
    new_user_id := gen_random_uuid();
    encrypted_pw := crypt(password, gen_salt('bf'));

    -- Insert into auth.users (The core user record)
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        created_at,
        updated_at,
        last_sign_in_at,
        confirmation_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        new_user_id,
        'authenticated',
        'authenticated',
        email,
        encrypted_pw,
        now(), -- Auto-confirm the email so they can login immediately
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        user_metadata,
        false,
        now(),
        now(),
        NULL,
        encode(gen_random_bytes(32), 'hex')
    );

    -- Insert into auth.identities (Required for login to work properly in some versions)
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        new_user_id,
        format('{"sub": "%s", "email": "%s"}', new_user_id::text, email)::jsonb,
        'email',
        new_user_id::text, -- Provider ID for email is the user UUID
        NULL,
        now(),
        now()
    );

    -- Trigger will handle creating the public.profile and public.coach linkage automatically
    -- via the existing 'on_auth_user_created' trigger.

    RETURN new_user_id;
END;
$$;

-- 4. Grant access to the function
GRANT EXECUTE ON FUNCTION public.create_new_user(text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_new_user(text, text, jsonb) TO service_role;

-- 5. Force Schema Refresh so RPC is visible
NOTIFY pgrst, 'reload';

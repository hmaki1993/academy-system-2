-- MASTER FIX FOR ENUM CASE AND COACH ACCOUNTS
-- This script fixes the 'Head_coach' vs 'head_coach' issue and re-runs the account backfill safely.

-- 1. Standardize Enum Values (Rename Head_coach to head_coach if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_enum e 
        JOIN pg_type t ON t.oid = e.enumtypid 
        WHERE t.typname = 'user_role' AND e.enumlabel = 'Head_coach'
    ) THEN
        ALTER TYPE user_role RENAME VALUE 'Head_coach' TO 'head_coach';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not rename enum, maybe it already exists as lowercase: %', SQLERRM;
END $$;

-- 2. Update handle_new_user Trigger Function (Make it case-insensitive)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    role_str text;
    final_role user_role;
BEGIN
    -- Get role from metadata and normalize to lowercase
    role_str := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'coach'));
    
    -- Safe casting (wrap in block to handle unexpected strings)
    BEGIN
        final_role := role_str::user_role;
    EXCEPTION WHEN OTHERS THEN
        final_role := 'coach'::user_role; -- Fallback
    END;

    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'), final_role)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role;

    -- Link coach if email matches
    UPDATE public.coaches SET profile_id = NEW.id WHERE LOWER(email) = LOWER(NEW.email);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update create_new_user RPC (Ensure it uses the fix)
CREATE OR REPLACE FUNCTION public.create_new_user(
    email text,
    password text,
    user_metadata jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    new_user_id uuid;
    encrypted_pw text;
    role_normalized text;
BEGIN
    -- Normalize role in metadata for the trigger to use
    role_normalized := LOWER(COALESCE(user_metadata->>'role', 'coach'));
    
    -- Check if user already exists
    IF EXISTS (SELECT 1 FROM auth.users WHERE auth.users.email = create_new_user.email) THEN
        RETURN (SELECT id FROM auth.users WHERE auth.users.email = create_new_user.email);
    END IF;

    new_user_id := gen_random_uuid();
    encrypted_pw := crypt(password, gen_salt('bf'));

    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, 
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
        is_super_admin, created_at, updated_at, confirmation_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated', 
        email, encrypted_pw, now(), '{"provider": "email", "providers": ["email"]}'::jsonb, 
        user_metadata || jsonb_build_object('role', role_normalized), -- Overwrite with normalized role
        false, now(), now(), encode(gen_random_bytes(32), 'hex')
    );

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
    VALUES (gen_random_uuid(), new_user_id, format('{"sub": "%s", "email": "%s"}', new_user_id::text, email)::jsonb, 'email', new_user_id::text, now(), now());

    RETURN new_user_id;
END;
$$;

-- 4. Re-run Backfill for existing coaches
DO $$
DECLARE
    r RECORD;
    new_id UUID;
BEGIN
    FOR r IN SELECT * FROM public.coaches LOOP
        BEGIN
            -- Try to create/get auth user
            new_id := public.create_new_user(r.email, '123456', jsonb_build_object('full_name', r.full_name, 'role', r.role));
            
            -- Explicitly link
            UPDATE public.coaches SET profile_id = new_id WHERE id = r.id;
            UPDATE public.profiles SET role = LOWER(r.role)::user_role, full_name = r.full_name WHERE id = new_id;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed for %: %', r.email, SQLERRM;
        END;
    END LOOP;
END $$;

NOTIFY pgrst, 'reload';

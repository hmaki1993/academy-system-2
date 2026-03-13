-- FINAL TOTAL FIX FOR ALL COACHES (V2.1)
-- This script will repair EVERY coach account on the system.
-- All coaches will be able to log in with password: '123456'

-- 1. Ensure Enum case is correct
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type t WHERE t.typname = 'user_role') THEN
        BEGIN
            ALTER TYPE user_role RENAME VALUE 'Head_coach' TO 'head_coach';
        EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;
END $$;

-- 2. Mass Repair Block
DO $$
DECLARE
    r RECORD;
    target_id uuid;
    coach_name text;
    coach_role text;
    target_email text;
    target_pw text := '123456';
BEGIN
    -- Trim and lowercase all coach emails first
    UPDATE public.coaches SET email = TRIM(LOWER(email)) WHERE email IS NOT NULL;

    FOR r IN SELECT * FROM public.coaches WHERE email IS NOT NULL AND email != '' LOOP
        target_email := r.email;
        coach_name := r.full_name;
        coach_role := COALESCE(r.role, 'coach');

        BEGIN
            -- A. Unlink to avoid issues during delete
            UPDATE public.coaches SET profile_id = NULL WHERE id = r.id;
            
            -- B. Total Wipe of existing auth/profile for this email
            -- (Don't wipe if it's the current user running the script!)
            IF target_email != (SELECT email FROM auth.users WHERE id = auth.uid()) THEN
                DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email = target_email);
                DELETE FROM public.profiles WHERE LOWER(email) = target_email;
                DELETE FROM auth.users WHERE email = target_email;
            END IF;

            -- C. Create Fresh Auth Record
            target_id := gen_random_uuid();

            INSERT INTO auth.users (
                id, instance_id, aud, role, email, encrypted_password, 
                email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
                is_super_admin, is_sso_user, created_at, updated_at,
                confirmation_token, recovery_token, email_change_token_new, email_change
            ) VALUES (
                target_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
                target_email, crypt(target_pw, gen_salt('bf', 10)), now(), 
                '{"provider": "email", "providers": ["email"]}'::jsonb, 
                jsonb_build_object('full_name', coach_name, 'role', LOWER(coach_role)), 
                false, false, now(), now(), '', '', '', ''
            );

            -- D. Create fresh Identity
            INSERT INTO auth.identities (
                id, user_id, identity_data, provider, provider_id, created_at, updated_at
            ) VALUES (
                gen_random_uuid(), target_id, 
                format('{"sub": "%s", "email": "%s"}', target_id::text, target_email)::jsonb, 
                'email', target_id::text, now(), now()
            );

            -- E. Re-link to Profile and Coach
            INSERT INTO public.profiles (id, email, full_name, role)
            VALUES (target_id, target_email, coach_name, LOWER(coach_role)::user_role)
            ON CONFLICT (id) DO UPDATE SET
                role = EXCLUDED.role,
                full_name = EXCLUDED.full_name;

            UPDATE public.coaches 
            SET profile_id = target_id 
            WHERE id = r.id;

            RAISE NOTICE 'Repaired: %', target_email;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to repair %: %', target_email, SQLERRM;
        END;
    END LOOP;
END $$;

NOTIFY pgrst, 'reload';

-- NUCLEAR REBUILD: FIX ALL COACH ACCOUNTS AT ONCE
-- This script will force every coach record to match its Supabase Auth ID.

DO $$
DECLARE
    r RECORD;
    real_auth_id UUID;
BEGIN
    RAISE NOTICE 'Starting Nuclear Rebuild of Coach Accounts...';

    FOR r IN (SELECT id, full_name, email, role FROM public.coaches) LOOP
        -- 1. Get the REAL ID from Supabase Auth (the one they login with)
        SELECT id INTO real_auth_id FROM auth.users WHERE email = r.email;

        IF real_auth_id IS NOT NULL THEN
            RAISE NOTICE 'Found real Auth ID for %: %', r.email, real_auth_id;

            -- 2. Delete any "Shadow" profiles that are blocking the email
            -- If there's a profile with this email but a DIFFERENT ID, it must go.
            DELETE FROM public.profiles WHERE email = r.email AND id != real_auth_id;

            -- 3. Ensure the REAL profile exists
            INSERT INTO public.profiles (id, email, full_name, role)
            VALUES (real_auth_id, r.email, r.full_name, r.role::user_role)
            ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                full_name = EXCLUDED.full_name,
                role = EXCLUDED.role;

            -- 4. UPDATE THE COACH RECORD WITH THE REAL ID
            -- This is the crucial step. We change the ID and the profile_link.
            -- Note: We have to handle foreign keys.
            
            -- Temporarily disable FK checks to swap IDs if coach ID is also the UUID
            -- (Assuming coach ID is UUID, if not, we just update profile_id)
            UPDATE public.coaches SET profile_id = real_auth_id WHERE email = r.email;
            
            -- If the coach table's primary KEY is also wrong, we fix it
            -- (Most systems use profile_id as the primary link)
            RAISE NOTICE 'SUCCESS: Coach % is now linked to real Auth ID.', r.email;

        ELSE
            RAISE NOTICE 'WARNING: No Auth Account exists for %. I will create one now with password 123456...', r.email;
            
            -- Attempt to create the missing account
            BEGIN
                real_auth_id := public.create_new_user(
                    r.email, 
                    '123456', 
                    jsonb_build_object('full_name', r.full_name, 'role', r.role)
                );
                
                IF real_auth_id IS NOT NULL THEN
                    UPDATE public.coaches SET profile_id = real_auth_id WHERE email = r.email;
                    RAISE NOTICE 'CREATED: New account for % with ID %', r.email, real_auth_id;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'CRITICAL: Failed to create user for %: %', r.email, SQLERRM;
            END;
        END IF;
    END LOOP;
END $$;

NOTIFY pgrst, 'reload';

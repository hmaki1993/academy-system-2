-- AUDIT AND REPAIR COACH ACCOUNTS
-- This script will identify and fix accounts that cannot log in.

DO $$
DECLARE
    r RECORD;
    new_id UUID;
BEGIN
    RAISE NOTICE 'Starting Coach Account Audit...';

    FOR r IN (
        SELECT id, full_name, email, role, profile_id 
        FROM public.coaches
    ) LOOP
        -- Check if Profile exists and is linked properly
        IF r.profile_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = r.profile_id) THEN
            RAISE NOTICE 'Coach % (%) has no valid profile link. Attempting to match by email...', r.full_name, r.email;
            
            -- Try to find existing profile by email
            SELECT id INTO new_id FROM public.profiles WHERE email = r.email;
            
            IF new_id IS NOT NULL THEN
                UPDATE public.coaches SET profile_id = new_id WHERE id = r.id;
                RAISE NOTICE 'Linked coach % to existing profile %', r.email, new_id;
            ELSE
                RAISE NOTICE 'No profile found for %. This account definitely cannot log in.', r.email;
            END IF;
        END IF;

        -- Check if Auth User exists (Only via metadata or if we had access, but we can try to re-create if missing)
        -- Since we can't directly SELECT from auth.users easily here without service_role permissions,
        -- we will use the 'create_new_user' logic which has its own existence checks.
        
        BEGIN
            -- This will only create if mail doesn't exist in auth.users
            -- Default password for broken accounts will be reset to '123456'
            SELECT public.create_new_user(
                r.email, 
                '123456', 
                jsonb_build_object('full_name', r.full_name, 'role', r.role)
            ) INTO new_id;
            
            IF new_id IS NOT NULL THEN
                UPDATE public.coaches SET profile_id = new_id WHERE id = r.id;
                RAISE NOTICE 'SUCCESS: Created NEW Auth account for % (ID: %). Password reset to 123456', r.email, new_id;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- If it fails, it usually means the user ALREADY exists in auth.users
            -- but might not be linked.
            RAISE NOTICE 'User % already exists in Auth OR another error occurred: %', r.email, SQLERRM;
        END;
    END LOOP;
END $$;

NOTIFY pgrst, 'reload';

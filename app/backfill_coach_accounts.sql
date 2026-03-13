-- BACKFILL ACCOUNTS FOR EXISTING COACHES
-- This script creates a User Account for every Coach that doesn't have one yet.
-- It sets a default password: '123456'

-- Prerequisite: Make sure the 'create_new_user' function exists (from enable_admin_user_creation.sql)

DO $$
DECLARE
    coach_rec RECORD;
    new_user_id UUID;
BEGIN
    -- Loop through all coaches
    FOR coach_rec IN SELECT * FROM public.coaches LOOP
        
        -- Check if an Auth User already exists with this email
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = coach_rec.email) THEN
            
            RAISE NOTICE 'Creating account for: %', coach_rec.email;

            -- Create the user with default password '123456'
            -- We wrap in a block to catch errors (like if function is missing)
            BEGIN
                SELECT public.create_new_user(
                    coach_rec.email, 
                    '123456', 
                    jsonb_build_object(
                        'full_name', coach_rec.full_name, 
                        'role', coach_rec.role
                    )
                ) INTO new_user_id;

                -- Manually link just to be safe (though handle_new_user trigger might do it)
                UPDATE public.coaches 
                SET profile_id = new_user_id 
                WHERE id = coach_rec.id;
                
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Failed to create user for %: %', coach_rec.email, SQLERRM;
            END;

        ELSE
            RAISE NOTICE 'User already exists for: %', coach_rec.email;
            
            -- Ensure they are linked if they exist but link is missing
            UPDATE public.coaches 
            SET profile_id = (SELECT id FROM auth.users WHERE email = coach_rec.email)
            WHERE id = coach_rec.id AND profile_id IS NULL;
            
        END IF;

    END LOOP;
END $$;

-- Force refresh schema
NOTIFY pgrst, 'reload';

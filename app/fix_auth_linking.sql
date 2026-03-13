-- FIX AUTH LINKING FOR COACHES
-- This script updates the trigger so that when you Create a User in Supabase Auth,
-- it automatically links to the existing Coach profile you created in the app.

-- 1. Improved Trigger Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    existing_coach_id UUID;
    existing_profile_id UUID;
BEGIN
    -- Check if a coach with this email already exists
    SELECT id, profile_id INTO existing_coach_id, existing_profile_id
    FROM public.coaches
    WHERE email = NEW.email;

    -- Create or Update the Profile
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'coach'::user_role)
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role;

    -- If a coach existed, LINK them to this new user!
    IF existing_coach_id IS NOT NULL THEN
        -- Link the coach record to the new Auth User ID
        UPDATE public.coaches
        SET profile_id = NEW.id
        WHERE id = existing_coach_id;
        
        -- Optional: Delete the old temporary profile if it was a random UUID and distinct
        IF existing_profile_id IS NOT NULL AND existing_profile_id != NEW.id THEN
            -- Check if it's safe to delete (not referenced elsewhere ideally, or cascade)
            -- For safety, we just leave it or log it. 
            -- DELETE FROM public.profiles WHERE id = existing_profile_id; 
            NULL; 
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Recreate Trigger (Just in case)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Run a manual fix for ALREADY created users (if any match by email but check failed)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT u.id AS auth_id, u.email, c.id AS coach_id, c.profile_id AS coach_profile_id
        FROM auth.users u
        JOIN public.coaches c ON LOWER(c.email) = LOWER(u.email)
        WHERE c.profile_id != u.id OR c.profile_id IS NULL
    LOOP
        UPDATE public.coaches SET profile_id = r.auth_id WHERE id = r.coach_id;
    END LOOP;
END $$;

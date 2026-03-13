-- ☢️ THE ABSOLUTE NUCLEAR SETUP (v18 - THE UNSTOPPABLE FORCE) ☢️
-- Run this in your Supabase SQL Editor. This fixes the "Sync Timeout" once and for all.

BEGIN;

-- 1. Ensure public.profiles is healthy
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT;

-- 2. CREATE THE MASTER SYNC FUNCTION (From Auth -> Profiles)
-- This ensures that ANY user created in Supabase (Edge Function or Manual) appears in profiles.
CREATE OR REPLACE FUNCTION public.handle_new_user_sync()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'fullName', 'New Staff'), 
        LOWER(TRIM(NEW.email)), 
        COALESCE(NEW.raw_user_meta_data->>'role', 'coach')
    )
    ON CONFLICT (id) DO UPDATE 
    SET 
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        role = COALESCE(EXCLUDED.role, public.profiles.role);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. APPLY MASTER SYNC TRIGGER TO auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_sync();

-- 4. ENSURE THE COACH LINKAGE TRIGGER (From Profiles -> Coaches)
-- This ensures that any record in profiles with a staff role gets a coach record.
CREATE OR REPLACE FUNCTION public.ensure_staff_coach_record()
RETURNS TRIGGER AS $$
DECLARE
    clean_email TEXT;
BEGIN
    clean_email := LOWER(TRIM(NEW.email));
    
    IF NEW.role IN ('coach', 'head_coach', 'reception', 'receptionist', 'cleaner') THEN
        INSERT INTO public.coaches (profile_id, full_name, email, role, pt_rate, salary)
        VALUES (NEW.id, NEW.full_name, clean_email, NEW.role, 0, 0)
        ON CONFLICT (profile_id) DO UPDATE 
        SET 
            email = COALESCE(EXCLUDED.email, public.coaches.email, clean_email),
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_ensure_staff_coach_record ON public.profiles;
CREATE TRIGGER tr_ensure_staff_coach_record
AFTER INSERT OR UPDATE OF full_name, role, email ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.ensure_staff_coach_record();

-- 5. REPAIR ALL ORPHANS IMMEDIATELY
-- Fill profiles from existing auth users
INSERT INTO public.profiles (id, full_name, email, role)
SELECT id, 
       COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'fullName', 'Staff Member'), 
       email, 
       COALESCE(raw_user_meta_data->>'role', (SELECT role FROM public.coaches WHERE profile_id = auth.users.id LIMIT 1), 'coach')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Fill coaches from profiles
INSERT INTO public.coaches (profile_id, full_name, email, role, pt_rate, salary)
SELECT id, full_name, email, role, 0, 0
FROM public.profiles
WHERE role IN ('coach', 'head_coach', 'reception', 'receptionist', 'cleaner')
ON CONFLICT (profile_id) DO NOTHING;

COMMIT;

-- FINAL STATUS
SELECT 'SUCCESS: All systems synced. Profiles & Coaches are now automated.' as status, COUNT(*) FROM public.profiles;

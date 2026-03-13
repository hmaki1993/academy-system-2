-- FIX FOR COACH LINKAGE & UNIQUE CONSTRAINTS
-- Run this in your Supabase SQL Editor

-- 1. Ensure profiles table has email column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- 2. DEDUPLICATION: Remove any duplicate coach records for the same profile
-- This is necessary before we can add a UNIQUE constraint
DELETE FROM public.coaches a USING public.coaches b
WHERE a.ctid < b.ctid 
AND a.profile_id = b.profile_id;

-- 3. ADD UNIQUE CONSTRAINT
-- This enables us to use ON CONFLICT (profile_id)
ALTER TABLE public.coaches DROP CONSTRAINT IF EXISTS coaches_profile_id_key;
ALTER TABLE public.coaches ADD CONSTRAINT coaches_profile_id_key UNIQUE (profile_id);

-- 4. DB TRIGGER FOR AUTOMATED COACH LINKAGE
CREATE OR REPLACE FUNCTION public.ensure_staff_coach_record()
RETURNS TRIGGER AS $$
BEGIN
    -- Only act on roles that require a record in the 'coaches' table
    IF NEW.role IN ('coach', 'head_coach', 'reception', 'receptionist', 'cleaner') THEN
        INSERT INTO public.coaches (profile_id, full_name, email, role, pt_rate, salary)
        VALUES (NEW.id, NEW.full_name, NEW.email, NEW.role, 0, 0)
        ON CONFLICT (profile_id) DO UPDATE 
        SET 
            full_name = EXCLUDED.full_name,
            email = EXCLUDED.email,
            role = EXCLUDED.role;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS tr_ensure_staff_coach_record ON public.profiles;

-- Create trigger to run AFTER profile creation or update
CREATE TRIGGER tr_ensure_staff_coach_record
AFTER INSERT OR UPDATE OF full_name, role, email ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.ensure_staff_coach_record();

-- 5. REPAIR EXISTING DATA: Link any orphaned profiles to coach records
-- First sync email from coaches if available
UPDATE public.profiles p
SET email = c.email
FROM public.coaches c
WHERE p.id = c.profile_id
AND p.email IS NULL;

INSERT INTO public.coaches (profile_id, full_name, email, role, pt_rate, salary)
SELECT id, full_name, email, role, 0, 0
FROM public.profiles
WHERE role IN ('coach', 'head_coach', 'reception', 'receptionist', 'cleaner')
AND id NOT IN (SELECT profile_id FROM public.coaches WHERE profile_id IS NOT NULL)
ON CONFLICT (profile_id) DO NOTHING;

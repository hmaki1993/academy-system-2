-- ============================================================
-- SQL_FIX_01_CLEANUP: Merge Birth Dates & Remove Cleaner Role
-- ============================================================

-- 1. Migrate data from birth_date to date_of_birth if birth_date has values
UPDATE public.students 
SET date_of_birth = birth_date 
WHERE date_of_birth IS NULL AND birth_date IS NOT NULL;

-- 2. Drop the redundant column
ALTER TABLE public.students DROP COLUMN IF EXISTS birth_date;

-- 3. Cleanup user_role enum (Remove 'cleaner')
-- Check if any users are cleaners first
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE role = 'cleaner') THEN
        UPDATE public.profiles SET role = 'coach' WHERE role = 'cleaner';
    END IF;
END $$;

-- 4. Re-create enum without cleaner (Postgres is strict with ENUMs)
-- We rename the old one, create new one, and swap.
DO $$
BEGIN
    -- Create temporary type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_new') THEN
        CREATE TYPE user_role_new AS ENUM ('admin', 'head_coach', 'coach', 'reception');
    END IF;

    -- Alter column to use new type
    ALTER TABLE public.profiles ALTER COLUMN role TYPE user_role_new USING role::text::user_role_new;

    -- Drop old type and rename new one
    DROP TYPE IF EXISTS user_role;
    ALTER TYPE user_role_new RENAME TO user_role;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Enum swap might have failed, check manually';
END $$;

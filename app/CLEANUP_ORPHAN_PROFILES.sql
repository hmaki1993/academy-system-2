-- 🛡️ CLEANUP SCRIPT: Orphaned Staff Profiles
-- Run this in the Supabase SQL Editor to remove profiles that were left behind
-- after staff (coaches/cleaners) were deleted from the UI.

BEGIN;

-- 1. Identify and delete orphaned coach/staff profiles
-- These are profiles with 'coach' or 'reception' roles that don't have a corresponding record in the coaches table
DELETE FROM public.profiles
WHERE role IN ('coach', 'reception', 'receptionist', 'cleaner')
AND id NOT IN (SELECT profile_id FROM public.coaches WHERE profile_id IS NOT NULL);

-- 2. (Optional) Cleanup any users in auth.users that no longer have profiles
-- This is harder via SQL as auth is in a separate schema, but deleting from public.profiles
-- will trigger the "Security Lock" I added to the app.

COMMIT;

-- 🛡️ THE SUPER CLEANUP: Final Duplicate Resolution
-- This script is "Aggressive": It will merge all duplicates by email and lock the table.

BEGIN;

-- 1. Normalize all emails to lowercase in both tables for perfect matching
UPDATE public.coaches SET email = LOWER(TRIM(email));
UPDATE public.profiles SET email = LOWER(TRIM(email));

-- 2. DEDUPLICATION BRUTE FORCE:
-- We keep the record with a profile_id if it exists, otherwise we keep the oldest.
DELETE FROM public.coaches a USING public.coaches b
WHERE a.id < b.id 
AND a.email = b.email;

-- 3. LOCK THE DOOR: Add a Unique Constraint on Email
-- This is what prevents the 2nd record from being created even if there's a race condition.
ALTER TABLE public.coaches DROP CONSTRAINT IF EXISTS coaches_email_key;
ALTER TABLE public.coaches ADD CONSTRAINT coaches_email_key UNIQUE (email);

COMMIT;

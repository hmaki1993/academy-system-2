-- FIX PROFILE EMAIL CONSTRAINT
-- The frontend might try to update a profile without sending the email, causing a NOT NULL violation.
-- This script makes the email column optional in the profiles table to prevent this error.

-- 1. Alter profiles table to allow NULL emails
ALTER TABLE public.profiles 
ALTER COLUMN email DROP NOT NULL;

-- 2. Verify
SELECT table_name, column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'email';

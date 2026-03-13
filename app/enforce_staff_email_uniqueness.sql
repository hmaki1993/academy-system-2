-- Migration: Enforce Staff Email Uniqueness
-- This migration removes duplicate staff records where no account was linked 
-- and adds a UNIQUE constraint to the email column.

-- 1. Remove duplicate records that don't have a linked profile_id
-- We target 'mohamed@epic.com' specifically as it was the identified issue, 
-- but we generalize to any duplicates where one entry has a profile and the other doesn't.
DELETE FROM coaches
WHERE email IN (
    SELECT email 
    FROM coaches 
    GROUP BY email 
    HAVING COUNT(*) > 1
)
AND profile_id IS NULL;

-- 2. Add the UNIQUE constraint to the email column
-- This will prevent future duplicates at the database level.
ALTER TABLE coaches
ADD CONSTRAINT coaches_email_key UNIQUE (email);

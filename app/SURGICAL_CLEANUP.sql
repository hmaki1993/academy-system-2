-- 🧹 SURGICAL CLEANUP FOR STUCK ACCOUNTS
-- Use this if you get a "Service Timeout" or "Already exists" error for a specific email.
-- Replace 'aa@epic.com' with the email that is causing trouble.

DO $$ 
DECLARE 
    target_email TEXT := 'aa@epic.com'; -- <--- CHANGE THIS
    target_id UUID;
BEGIN
    -- 1. Find the profile ID if it exists
    SELECT id INTO target_id FROM public.profiles WHERE email = target_email;
    
    -- 2. Delete from coaches (orphans and linked)
    DELETE FROM public.coaches WHERE email = target_email OR profile_id = target_id;
    
    -- 3. Delete from profiles
    DELETE FROM public.profiles WHERE id = target_id;

    RAISE NOTICE 'Cleaned up all public references for %', target_email;
END $$;

-- 🕵️ CHECK AFTERMATH
SELECT * FROM public.coaches WHERE email = 'aa@epic.com';
SELECT * FROM public.profiles WHERE email = 'aa@epic.com';

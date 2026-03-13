    -- FIX DEMO SEEDING ISSUE
    -- Run this script in SQL Editor to fix the foreign key error

    -- 1. Drop the foreign key constraint identifying profiles with auth.users
    -- This allows us to create "fake" users for the demo without needing real email/password logins for everyone
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

    -- 2. Clean up any partial data
    DELETE FROM groups;
    DELETE FROM attendance;
    DELETE FROM subscriptions;
    DELETE FROM students;
    DELETE FROM profiles;

    -- 3. Now Run the Seed Data again!
    -- (Copy and run the content of seed_demo_data.sql after running this)

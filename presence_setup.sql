-- [SQL] ADD PRESENCE TRACKING TO PROFILES
-- Purpose: Adds a 'last_active_at' column to track real-time user activity.
-- Run this in your Supabase SQL Editor.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();

-- Also, let's enable realtime for the profiles table if not already enabled
-- to make sure the coach gets updates faster.
BEGIN;
  ALTER TABLE public.profiles REPLICA IDENTITY FULL;
  -- Note: Adding table to publication might fail if it's already there, so we wrap it
  DO $$ 
  BEGIN 
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  EXCEPTION WHEN OTHERS THEN 
    NULL; 
  END $$;
COMMIT;

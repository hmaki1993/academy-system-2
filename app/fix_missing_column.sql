-- FIX SPECIFIC MISSING COLUMN
-- Run this script to force add the missing column

DO $$
BEGIN
    -- 1. Add pt_sessions_count to coach_attendance if missing
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coach_attendance') THEN
        ALTER TABLE public.coach_attendance 
        ADD COLUMN IF NOT EXISTS pt_sessions_count INTEGER DEFAULT 0;
    END IF;

    -- 2. Add sessions_count to pt_sessions if missing
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pt_sessions') THEN
        ALTER TABLE public.pt_sessions
        ADD COLUMN IF NOT EXISTS sessions_count INTEGER DEFAULT 1;
    END IF;
END $$;

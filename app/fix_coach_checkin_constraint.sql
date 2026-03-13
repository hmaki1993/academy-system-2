-- FIX COACH CHECK-IN: Add Missing Unique Constraint
-- This allows the frontend's upsert operation to work correctly

-- 1. Add the unique constraint on (coach_id, date)
-- This ensures one attendance record per coach per day
ALTER TABLE public.coach_attendance 
DROP CONSTRAINT IF EXISTS coach_attendance_coach_id_date_key;

ALTER TABLE public.coach_attendance 
ADD CONSTRAINT coach_attendance_coach_id_date_key 
UNIQUE (coach_id, date);

-- 2. Ensure all required columns exist
ALTER TABLE public.coach_attendance 
ADD COLUMN IF NOT EXISTS note TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'present',
ADD COLUMN IF NOT EXISTS pt_sessions_count INTEGER DEFAULT 0;

-- 3. Force cache refresh
DO $$ 
BEGIN 
    EXECUTE 'COMMENT ON TABLE public.coach_attendance IS ''Fixed: ' || NOW() || '''';
END $$;

NOTIFY pgrst, 'reload';

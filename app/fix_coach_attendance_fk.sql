-- FIX COACH_ATTENDANCE FOREIGN KEY CONSTRAINT
-- The constraint is pointing to 'profiles' instead of 'coaches'

-- 1. Check current foreign key constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'coach_attendance';

-- 2. Drop the incorrect foreign key constraint
ALTER TABLE public.coach_attendance
DROP CONSTRAINT IF EXISTS coach_attendance_coach_id_fkey;

-- 3. Add the correct foreign key constraint pointing to coaches table
ALTER TABLE public.coach_attendance
ADD CONSTRAINT coach_attendance_coach_id_fkey
FOREIGN KEY (coach_id) REFERENCES public.coaches(id) ON DELETE CASCADE;

-- 4. Force cache refresh
DO $$ 
BEGIN 
    EXECUTE 'COMMENT ON TABLE public.coach_attendance IS ''Fixed FK: ' || NOW() || '''';
END $$;

NOTIFY pgrst, 'reload';

-- 5. Verify the fix by checking constraints again
SELECT
    'AFTER FIX' as status,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'coach_attendance'
AND kcu.column_name = 'coach_id';

-- 6. Test the insert
INSERT INTO public.coach_attendance (coach_id, date, check_in_time, status)
VALUES ('d5a7a8bc-98c5-4820-b66b-098d2d8bde9a', CURRENT_DATE, NOW(), 'present')
ON CONFLICT (coach_id, date) DO UPDATE
SET check_in_time = NOW(),
    status = 'present',
    check_out_time = NULL
RETURNING 
    id,
    coach_id,
    date,
    check_in_time,
    status;

-- FORCE FIX COACH_ATTENDANCE FOREIGN KEY
-- Drop and recreate the entire constraint

-- 1. Check current constraints
SELECT 
    'BEFORE FIX' as status,
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as referenced_table
FROM pg_constraint
WHERE conrelid = 'public.coach_attendance'::regclass
AND contype = 'f';

-- 2. Drop ALL foreign key constraints on coach_id
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.coach_attendance'::regclass
        AND contype = 'f'
        AND conname LIKE '%coach_id%'
    LOOP
        EXECUTE 'ALTER TABLE public.coach_attendance DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
        RAISE NOTICE 'Dropped constraint: %', r.conname;
    END LOOP;
END $$;

-- 3. Add the correct foreign key constraint
ALTER TABLE public.coach_attendance
ADD CONSTRAINT coach_attendance_coach_id_fkey
FOREIGN KEY (coach_id) 
REFERENCES public.coaches(id) 
ON DELETE CASCADE;

-- 4. Verify the fix
SELECT 
    'AFTER FIX' as status,
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as referenced_table
FROM pg_constraint
WHERE conrelid = 'public.coach_attendance'::regclass
AND contype = 'f';

-- 5. Force cache refresh
DO $$ 
BEGIN 
    EXECUTE 'COMMENT ON TABLE public.coach_attendance IS ''FK Fixed: ' || NOW() || '''';
END $$;

NOTIFY pgrst, 'reload';

-- 6. Test insert with correct coach_id
INSERT INTO public.coach_attendance (coach_id, date, check_in_time, status)
VALUES ('d5a7a9bc-98c5-4820-b6b8-098d2d8bde49', CURRENT_DATE, NOW(), 'present')
ON CONFLICT (coach_id, date) DO UPDATE
SET check_in_time = NOW(),
    status = 'present',
    check_out_time = NULL
RETURNING 
    'SUCCESS!' as result,
    id,
    coach_id,
    date,
    to_char(check_in_time, 'HH24:MI:SS') as check_in_time,
    status;

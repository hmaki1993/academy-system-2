-- FIX STUDENT_ATTENDANCE SCHEMA FOR 406 ERROR
-- The 406 error suggests missing columns or RLS issues

-- 1. Ensure all required columns exist
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMPTZ;

ALTER TABLE public.student_attendance
ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS student_id INTEGER REFERENCES public.students(id);

-- 2. Fix RLS policies for student_attendance
DROP POLICY IF EXISTS "Student attendance viewable by authenticated" ON public.student_attendance;
DROP POLICY IF EXISTS "Student attendance manageable by authenticated" ON public.student_attendance;

CREATE POLICY "Student attendance viewable by authenticated"
ON public.student_attendance
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Student attendance manageable by authenticated"
ON public.student_attendance
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. Fix RLS policies for students table
DROP POLICY IF EXISTS "Students viewable by authenticated" ON public.students;
DROP POLICY IF EXISTS "Students manageable by authenticated" ON public.students;

CREATE POLICY "Students viewable by authenticated"
ON public.students
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Students manageable by authenticated"
ON public.students
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Fix RLS policies for training_groups
DROP POLICY IF EXISTS "Training groups viewable by authenticated" ON public.training_groups;

CREATE POLICY "Training groups viewable by authenticated"
ON public.training_groups
FOR SELECT
TO authenticated
USING (true);

-- 5. Force cache refresh
DO $$ 
BEGIN 
    EXECUTE 'COMMENT ON TABLE public.student_attendance IS ''Fixed schema: ' || NOW() || '''';
    EXECUTE 'COMMENT ON TABLE public.students IS ''Fixed schema: ' || NOW() || '''';
    EXECUTE 'COMMENT ON TABLE public.training_groups IS ''Fixed schema: ' || NOW() || '''';
END $$;

NOTIFY pgrst, 'reload';

-- 6. Test the problematic query
SELECT 
    sa.student_id,
    sa.check_in_time,
    s.full_name,
    s.coach_id,
    tg.name as group_name
FROM public.student_attendance sa
INNER JOIN public.students s ON sa.student_id = s.id
LEFT JOIN public.training_groups tg ON s.training_group_id = tg.id
WHERE sa.date = '2026-02-07'
AND sa.check_out_time IS NULL
LIMIT 5;

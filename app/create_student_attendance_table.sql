-- CREATE STUDENT_ATTENDANCE TABLE (FIXED UUID TYPE)
-- This table is referenced by the frontend but doesn't exist in the database

-- 1. Create the table with correct UUID type for student_id
CREATE TABLE IF NOT EXISTS public.student_attendance (
    id SERIAL PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one attendance record per student per day
    UNIQUE (student_id, date)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_attendance_student_id ON public.student_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_date ON public.student_attendance(date);
CREATE INDEX IF NOT EXISTS idx_student_attendance_check_in ON public.student_attendance(check_in_time) WHERE check_in_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_student_attendance_check_out ON public.student_attendance(check_out_time) WHERE check_out_time IS NULL;

-- 3. Enable RLS
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
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

-- 5. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_student_attendance_updated_at ON public.student_attendance;

CREATE TRIGGER update_student_attendance_updated_at
    BEFORE UPDATE ON public.student_attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Force cache refresh
DO $$ 
BEGIN 
    EXECUTE 'COMMENT ON TABLE public.student_attendance IS ''Created table: ' || NOW() || '''';
END $$;

NOTIFY pgrst, 'reload';

-- 7. Verify the table was created
SELECT 
    'TABLE CREATED SUCCESSFULLY' as status,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'student_attendance'
AND table_schema = 'public'
ORDER BY ordinal_position;

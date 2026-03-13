-- Add note column
ALTER TABLE public.student_attendance 
ADD COLUMN IF NOT EXISTS note text;

-- Make check_in_time nullable so we can record 'absent' status without a time
ALTER TABLE public.student_attendance 
ALTER COLUMN check_in_time DROP NOT NULL;

-- Make default null for check_in_time just in case
ALTER TABLE public.student_attendance 
ALTER COLUMN check_in_time DROP DEFAULT;

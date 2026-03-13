-- Add note and status columns
ALTER TABLE public.coach_attendance 
ADD COLUMN IF NOT EXISTS note text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'present';

-- Make check_in_time nullable
ALTER TABLE public.coach_attendance 
ALTER COLUMN check_in_time DROP NOT NULL;

-- Remove default if exists to avoid auto-filling current time for absent records
ALTER TABLE public.coach_attendance 
ALTER COLUMN check_in_time DROP DEFAULT;

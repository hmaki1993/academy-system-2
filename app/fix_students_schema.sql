-- FIX STUDENTS TABLE SCHEMA
-- This script adds missing columns and fixes relationships for the students table.

-- 1. Add 'age' and 'birth_date' columns if they don't exist
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS birth_date DATE;

-- 2. Ensure 'coach_id' exists and has a foreign key relationship
-- First, try to add the column if it's missing
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS coach_id UUID;

-- Then, ensure the foreign key constraint exists. 
-- We drop it first to be safe and ensure it's correctly defined.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'students_coach_id_fkey'
    ) THEN
        ALTER TABLE public.students DROP CONSTRAINT students_coach_id_fkey;
    END IF;
END $$;

ALTER TABLE public.students
ADD CONSTRAINT students_coach_id_fkey
FOREIGN KEY (coach_id)
REFERENCES public.coaches(id)
ON DELETE SET NULL;

-- 3. Update existing records (Optional but good for consistency)
-- If we have birth_date but no age, calculate it.
UPDATE public.students
SET age = EXTRACT(YEAR FROM age(CURRENT_DATE, birth_date))
WHERE age IS NULL AND birth_date IS NOT NULL;

-- 4. Create an index for coach_id to help with joins (and resolve the relationship lookup)
CREATE INDEX IF NOT EXISTS idx_students_coach_id ON public.students(coach_id);

-- 5. Notify PostgREST to reload the schema cache
-- This is critical for fixing PGRST200 and PGRST204 errors immediately.
NOTIFY pgrst, 'reload';

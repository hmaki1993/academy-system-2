-- Add birth_date column to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS birth_date date;

-- Add comment for documentation
COMMENT ON COLUMN students.birth_date IS 'Birth date of the gymnast, used for automated age calculation.';

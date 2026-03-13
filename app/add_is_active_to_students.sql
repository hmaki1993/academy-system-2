-- Add is_active column to students table for manual activation/deactivation
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing students to be active by default
UPDATE students 
SET is_active = true 
WHERE is_active IS NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_students_is_active ON students(is_active);

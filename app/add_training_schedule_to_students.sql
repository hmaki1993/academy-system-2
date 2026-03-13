-- Add training_schedule JSONB column to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS training_schedule JSONB DEFAULT '[]';

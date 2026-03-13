-- Add training_days column to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS training_days TEXT[] DEFAULT '{}';

-- Add coach_id column to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL;

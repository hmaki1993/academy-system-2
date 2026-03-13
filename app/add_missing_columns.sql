-- Add 'age' column if it doesn't exist
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS age integer DEFAULT 0;

-- Add 'parent_contact' column if it doesn't exist (useful for younger students)
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS parent_contact text;

-- Add 'notes' column if it doesn't exist
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS notes text;

-- Verify 'subscription_expiry' exists (should be there, but good to ensure)
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS subscription_expiry timestamptz;

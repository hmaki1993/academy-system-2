-- Add updated_at column to training_groups table
ALTER TABLE training_groups 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS update_training_groups_updated_at ON training_groups;
CREATE TRIGGER update_training_groups_updated_at
    BEFORE UPDATE ON training_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

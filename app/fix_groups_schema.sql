-- Drop old table if exists (and cascade to remove foreign keys)
DROP TABLE IF EXISTS groups CASCADE;

-- Create training_groups table (renamed from groups to avoid keyword conflicts)
CREATE TABLE IF NOT EXISTS training_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    schedule_key TEXT NOT NULL, -- Unique string to identify schedule (e.g. "sat:16:00|mon:16:00")
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(coach_id, schedule_key)
);

-- Remove old column if exists
ALTER TABLE students DROP COLUMN IF EXISTS group_id;

-- Add training_group_id to students
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS training_group_id UUID REFERENCES training_groups(id) ON DELETE SET NULL;

-- RLS Policies
ALTER TABLE training_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON training_groups
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON training_groups
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON training_groups
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON training_groups
    FOR DELETE USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON training_groups TO authenticated;
GRANT SELECT ON training_groups TO anon;

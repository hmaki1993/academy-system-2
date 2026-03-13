-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    schedule_key TEXT NOT NULL, -- Unique string to identify schedule (e.g. "sat:16:00|mon:16:00")
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(coach_id, schedule_key)
);

-- Add group_id to students
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL;

-- RLS Policies for groups
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON groups
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON groups
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON groups
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON groups
    FOR DELETE USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON groups TO authenticated;
GRANT SELECT ON groups TO anon;

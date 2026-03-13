-- Create the student_training_schedule table
CREATE TABLE IF NOT EXISTS student_training_schedule (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE student_training_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON student_training_schedule
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON student_training_schedule
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON student_training_schedule
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON student_training_schedule
    FOR DELETE USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON student_training_schedule TO authenticated;
GRANT SELECT ON student_training_schedule TO anon;

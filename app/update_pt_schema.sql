-- Add student_name to pt_subscriptions for Guest PTs
ALTER TABLE pt_subscriptions
ADD COLUMN IF NOT EXISTS student_name TEXT;

-- Create PT Attendance Table
CREATE TABLE IF NOT EXISTS pt_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pt_subscription_id UUID REFERENCES pt_subscriptions(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in_time TIMESTAMPTZ DEFAULT NOW(),
    check_out_time TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'completed', 'absent')),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE pt_attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read access for all authenticated users" ON pt_attendance
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON pt_attendance
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON pt_attendance
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON pt_attendance
    FOR DELETE USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON pt_attendance TO authenticated;
GRANT SELECT ON pt_attendance TO anon;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE pt_attendance;

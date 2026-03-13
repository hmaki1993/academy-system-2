-- Create PT Subscriptions Table
CREATE TABLE IF NOT EXISTS pt_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
    student_name TEXT, -- Denormalized for convenience
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    sessions_total INTEGER NOT NULL CHECK (sessions_total > 0),
    sessions_remaining INTEGER NOT NULL CHECK (sessions_remaining >= 0),
    price_per_session DECIMAL(10, 2) NOT NULL CHECK (price_per_session >= 0),
    total_price DECIMAL(10, 2) NOT NULL CHECK (total_price >= 0),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_sessions CHECK (sessions_remaining <= sessions_total),
    CONSTRAINT valid_dates CHECK (expiry_date IS NULL OR expiry_date >= start_date)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_pt_subscriptions_student ON pt_subscriptions(student_id);
CREATE INDEX IF NOT EXISTS idx_pt_subscriptions_coach ON pt_subscriptions(coach_id);
CREATE INDEX IF NOT EXISTS idx_pt_subscriptions_status ON pt_subscriptions(status);

-- Enable RLS
ALTER TABLE pt_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read access for all authenticated users" ON pt_subscriptions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON pt_subscriptions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON pt_subscriptions
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON pt_subscriptions
    FOR DELETE USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON pt_subscriptions TO authenticated;
GRANT SELECT ON pt_subscriptions TO anon;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_pt_subscriptions_updated_at ON pt_subscriptions;
CREATE TRIGGER update_pt_subscriptions_updated_at
    BEFORE UPDATE ON pt_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE pt_subscriptions;

-- Ensure coaches table has pt_rate column
ALTER TABLE coaches 
ADD COLUMN IF NOT EXISTS pt_rate DECIMAL(10, 2) DEFAULT 0 CHECK (pt_rate >= 0);

-- Add comment
COMMENT ON TABLE pt_subscriptions IS 'Stores Personal Training subscription data for gymnasts';

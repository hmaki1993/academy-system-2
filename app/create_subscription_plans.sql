-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    duration_months INTEGER NOT NULL,
    price DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read plans
CREATE POLICY "Allow authenticated read access" 
ON subscription_plans FOR SELECT 
TO authenticated 
USING (true);

-- Allow admins to manage plans
CREATE POLICY "Allow admin full access" 
ON subscription_plans FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Seed default plans
INSERT INTO subscription_plans (name, duration_months, price)
VALUES 
    ('Monthly (1 Month)', 1, 0),
    ('Quarterly (3 Months)', 3, 0),
    ('Annual (1 Year)', 12, 0)
ON CONFLICT DO NOTHING;

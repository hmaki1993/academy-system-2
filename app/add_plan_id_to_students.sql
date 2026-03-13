-- Add subscription_plan_id to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS subscription_plan_id UUID REFERENCES subscription_plans(id);

-- Optional: Backfill existing students (this assumes a default plan exists or handled in logic)
-- UPDATE students SET subscription_plan_id = (SELECT id FROM subscription_plans WHERE name LIKE '%Monthly%' LIMIT 1) WHERE subscription_plan_id IS NULL;

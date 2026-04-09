-- Add Session Target columns to training_plans
ALTER TABLE public.training_plans 
ADD COLUMN IF NOT EXISTS target_time INTEGER,
ADD COLUMN IF NOT EXISTS target_jumps INTEGER;

-- Comment for documentation
COMMENT ON COLUMN public.training_plans.target_time IS 'Target session duration in minutes';
COMMENT ON COLUMN public.training_plans.target_jumps IS 'Target session jump count objective';

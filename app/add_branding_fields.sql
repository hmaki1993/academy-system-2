-- Add branding fields to gym_settings for global white-labeling
ALTER TABLE gym_settings 
ADD COLUMN IF NOT EXISTS academy_name TEXT DEFAULT 'Epic Gym Academy',
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS gym_address TEXT DEFAULT 'Cairo, Egypt',
ADD COLUMN IF NOT EXISTS gym_phone TEXT DEFAULT '+20 123 456 7890';

-- Add same fields to user_settings if we want per-user name (unlikely, but for sync consistency)
-- Actually, let's stick to global for the academy name for now.

-- Add login page customization fields to gym_settings
ALTER TABLE gym_settings 
ADD COLUMN IF NOT EXISTS login_bg_url TEXT,
ADD COLUMN IF NOT EXISTS login_logo_url TEXT,
ADD COLUMN IF NOT EXISTS login_card_opacity FLOAT DEFAULT 0.6,
ADD COLUMN IF NOT EXISTS login_card_color TEXT DEFAULT '#000000';

-- Add same fields to user_settings for consistency, though primarily used from gym_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS login_bg_url TEXT,
ADD COLUMN IF NOT EXISTS login_logo_url TEXT,
ADD COLUMN IF NOT EXISTS login_card_opacity FLOAT DEFAULT 0.6,
ADD COLUMN IF NOT EXISTS login_card_color TEXT DEFAULT '#000000';

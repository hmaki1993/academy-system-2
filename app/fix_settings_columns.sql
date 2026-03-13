-- Add missing columns to user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS clock_integration BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS weather_integration BOOLEAN DEFAULT true;

-- Add missing columns to gym_settings (ensure synchronization with GymSettings type)
ALTER TABLE gym_settings 
ADD COLUMN IF NOT EXISTS border_radius TEXT DEFAULT '1.5rem',
ADD COLUMN IF NOT EXISTS glass_opacity FLOAT DEFAULT 0.6,
ADD COLUMN IF NOT EXISTS surface_color TEXT DEFAULT 'rgba(18, 46, 52, 0.7)',
ADD COLUMN IF NOT EXISTS search_icon_color TEXT DEFAULT 'rgba(255, 255, 255, 0.4)',
ADD COLUMN IF NOT EXISTS search_bg_color TEXT DEFAULT 'rgba(255, 255, 255, 0.05)',
ADD COLUMN IF NOT EXISTS search_border_color TEXT DEFAULT 'rgba(255, 255, 255, 0.1)',
ADD COLUMN IF NOT EXISTS search_text_color TEXT DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS hover_color TEXT DEFAULT 'rgba(16, 185, 129, 0.8)',
ADD COLUMN IF NOT EXISTS hover_border_color TEXT DEFAULT 'rgba(16, 185, 129, 0.3)',
ADD COLUMN IF NOT EXISTS input_bg_color TEXT DEFAULT '#0f172a',
ADD COLUMN IF NOT EXISTS clock_position TEXT DEFAULT 'dashboard',
ADD COLUMN IF NOT EXISTS clock_integration BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS weather_integration BOOLEAN DEFAULT true;

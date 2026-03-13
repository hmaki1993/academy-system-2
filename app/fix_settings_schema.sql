-- Migration to add notification settings and other missing columns to user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS notify_sounds BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_payments BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_absences BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_registrations BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_browser_push BOOLEAN DEFAULT false;

-- Also add other missing interface keys that might cause issues
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS clock_integration BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS weather_integration BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_badge_color TEXT,
ADD COLUMN IF NOT EXISTS brand_label_color TEXT,
ADD COLUMN IF NOT EXISTS text_color_base TEXT,
ADD COLUMN IF NOT EXISTS text_color_muted TEXT;

-- Same for gym_settings just in case
ALTER TABLE gym_settings
ADD COLUMN IF NOT EXISTS notify_sounds BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_payments BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_absences BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_registrations BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_browser_push BOOLEAN DEFAULT false;

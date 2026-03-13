-- Comprehensive Login Page Customization Repair Script
-- Run this in your Supabase SQL Editor to sync all new features

-- 1. Sync gym_settings
ALTER TABLE gym_settings 
ADD COLUMN IF NOT EXISTS login_logo_url TEXT,
ADD COLUMN IF NOT EXISTS login_logo_scale FLOAT DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS login_logo_x_offset INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS login_logo_y_offset INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS login_bg_url TEXT,
ADD COLUMN IF NOT EXISTS login_bg_blur INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS login_bg_brightness FLOAT DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS login_bg_zoom FLOAT DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS login_bg_x_offset INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS login_bg_y_offset INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS login_card_opacity FLOAT DEFAULT 0.6,
ADD COLUMN IF NOT EXISTS login_card_color TEXT DEFAULT '#000000',
ADD COLUMN IF NOT EXISTS login_card_x_offset INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS login_card_y_offset INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS login_card_border_color TEXT DEFAULT '#ffffff33',
ADD COLUMN IF NOT EXISTS login_card_scale FLOAT DEFAULT 1.0;

-- 2. Sync user_settings for consistency
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS login_logo_url TEXT,
ADD COLUMN IF NOT EXISTS login_logo_scale FLOAT DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS login_logo_x_offset INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS login_logo_y_offset INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS login_bg_url TEXT,
ADD COLUMN IF NOT EXISTS login_bg_blur INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS login_bg_brightness FLOAT DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS login_bg_zoom FLOAT DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS login_bg_x_offset INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS login_bg_y_offset INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS login_card_opacity FLOAT DEFAULT 0.6,
ADD COLUMN IF NOT EXISTS login_card_color TEXT DEFAULT '#000000',
ADD COLUMN IF NOT EXISTS login_card_x_offset INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS login_card_y_offset INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS login_card_border_color TEXT DEFAULT '#ffffff33',
ADD COLUMN IF NOT EXISTS login_card_scale FLOAT DEFAULT 1.0;

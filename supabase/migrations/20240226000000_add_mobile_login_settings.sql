-- Migration to add mobile-specific login customization columns
-- This allows independent design for mobile devices

-- Add columns to gym_settings
ALTER TABLE public.gym_settings 
ADD COLUMN IF NOT EXISTS login_mobile_bg_url TEXT,
ADD COLUMN IF NOT EXISTS login_mobile_logo_url TEXT,
ADD COLUMN IF NOT EXISTS login_mobile_card_opacity FLOAT8,
ADD COLUMN IF NOT EXISTS login_mobile_card_color TEXT,
ADD COLUMN IF NOT EXISTS login_mobile_logo_scale FLOAT8,
ADD COLUMN IF NOT EXISTS login_mobile_logo_x_offset FLOAT8,
ADD COLUMN IF NOT EXISTS login_mobile_logo_y_offset FLOAT8,
ADD COLUMN IF NOT EXISTS login_mobile_bg_blur INT,
ADD COLUMN IF NOT EXISTS login_mobile_bg_brightness FLOAT8,
ADD COLUMN IF NOT EXISTS login_mobile_bg_zoom FLOAT8,
ADD COLUMN IF NOT EXISTS login_mobile_bg_x_offset FLOAT8,
ADD COLUMN IF NOT EXISTS login_mobile_bg_y_offset FLOAT8,
ADD COLUMN IF NOT EXISTS login_mobile_card_x_offset FLOAT8,
ADD COLUMN IF NOT EXISTS login_mobile_card_y_offset FLOAT8,
ADD COLUMN IF NOT EXISTS login_mobile_card_border_color TEXT,
ADD COLUMN IF NOT EXISTS login_mobile_card_scale FLOAT8,
ADD COLUMN IF NOT EXISTS login_mobile_show_logo BOOLEAN,
ADD COLUMN IF NOT EXISTS login_mobile_text_color TEXT,
ADD COLUMN IF NOT EXISTS login_mobile_accent_color TEXT,
ADD COLUMN IF NOT EXISTS login_mobile_logo_opacity FLOAT8;

-- Add columns to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS login_mobile_bg_url TEXT,
ADD COLUMN IF NOT EXISTS login_mobile_logo_url TEXT,
ADD COLUMN IF NOT EXISTS login_mobile_card_opacity FLOAT8,
ADD COLUMN IF NOT EXISTS login_mobile_card_color TEXT,
ADD COLUMN IF NOT EXISTS login_mobile_logo_scale FLOAT8,
ADD COLUMN IF NOT EXISTS login_mobile_logo_x_offset FLOAT8,
ADD COLUMN IF NOT EXISTS login_mobile_logo_y_offset FLOAT8,
ADD COLUMN IF NOT EXISTS login_mobile_bg_blur INT,
ADD COLUMN IF NOT EXISTS login_mobile_bg_brightness FLOAT8,
ADD COLUMN IF NOT EXISTS login_mobile_bg_zoom FLOAT8,
ADD COLUMN IF NOT EXISTS login_mobile_bg_x_offset FLOAT8,
ADD COLUMN IF NOT EXISTS login_mobile_bg_y_offset FLOAT8,
ADD COLUMN IF NOT EXISTS login_mobile_card_x_offset FLOAT8,
ADD COLUMN IF NOT EXISTS login_mobile_card_y_offset FLOAT8,
ADD COLUMN IF NOT EXISTS login_mobile_card_border_color TEXT,
ADD COLUMN IF NOT EXISTS login_mobile_card_scale FLOAT8,
ADD COLUMN IF NOT EXISTS login_mobile_show_logo BOOLEAN,
ADD COLUMN IF NOT EXISTS login_mobile_text_color TEXT,
ADD COLUMN IF NOT EXISTS login_mobile_accent_color TEXT,
ADD COLUMN IF NOT EXISTS login_mobile_logo_opacity FLOAT8;

-- Initialize mobile settings with current desktop values where null
UPDATE public.gym_settings 
SET 
  login_mobile_bg_url = COALESCE(login_mobile_bg_url, login_bg_url),
  login_mobile_logo_url = COALESCE(login_mobile_logo_url, login_logo_url),
  login_mobile_card_opacity = COALESCE(login_mobile_card_opacity, login_card_opacity),
  login_mobile_card_color = COALESCE(login_mobile_card_color, login_card_color),
  login_mobile_logo_scale = COALESCE(login_mobile_logo_scale, login_logo_scale),
  login_mobile_logo_x_offset = COALESCE(login_mobile_logo_x_offset, login_logo_x_offset),
  login_mobile_logo_y_offset = COALESCE(login_mobile_logo_y_offset, login_logo_y_offset),
  login_mobile_bg_blur = COALESCE(login_mobile_bg_blur, login_bg_blur),
  login_mobile_bg_brightness = COALESCE(login_mobile_bg_brightness, login_bg_brightness),
  login_mobile_bg_zoom = COALESCE(login_mobile_bg_zoom, login_bg_zoom),
  login_mobile_bg_x_offset = COALESCE(login_mobile_bg_x_offset, login_bg_x_offset),
  login_mobile_bg_y_offset = COALESCE(login_mobile_bg_y_offset, login_bg_y_offset),
  login_mobile_card_x_offset = COALESCE(login_mobile_card_x_offset, login_card_x_offset),
  login_mobile_card_y_offset = COALESCE(login_mobile_card_y_offset, login_card_y_offset),
  login_mobile_card_border_color = COALESCE(login_mobile_card_border_color, login_card_border_color),
  login_mobile_card_scale = COALESCE(login_mobile_card_scale, login_card_scale),
  login_mobile_show_logo = COALESCE(login_mobile_show_logo, login_show_logo),
  login_mobile_text_color = COALESCE(login_mobile_text_color, login_text_color),
  login_mobile_accent_color = COALESCE(login_mobile_accent_color, login_accent_color),
  login_mobile_logo_opacity = COALESCE(login_mobile_logo_opacity, login_logo_opacity);

UPDATE public.user_settings 
SET 
  login_mobile_bg_url = COALESCE(login_mobile_bg_url, login_bg_url),
  login_mobile_logo_url = COALESCE(login_mobile_logo_url, login_logo_url),
  login_mobile_card_opacity = COALESCE(login_mobile_card_opacity, login_card_opacity),
  login_mobile_card_color = COALESCE(login_mobile_card_color, login_card_color),
  login_mobile_logo_scale = COALESCE(login_mobile_logo_scale, login_logo_scale),
  login_mobile_logo_x_offset = COALESCE(login_mobile_logo_x_offset, login_logo_x_offset),
  login_mobile_logo_y_offset = COALESCE(login_mobile_logo_y_offset, login_logo_y_offset),
  login_mobile_bg_blur = COALESCE(login_mobile_bg_blur, login_bg_blur),
  login_mobile_bg_brightness = COALESCE(login_mobile_bg_brightness, login_bg_brightness),
  login_mobile_bg_zoom = COALESCE(login_mobile_bg_zoom, login_bg_zoom),
  login_mobile_bg_x_offset = COALESCE(login_mobile_bg_x_offset, login_bg_x_offset),
  login_mobile_bg_y_offset = COALESCE(login_mobile_bg_y_offset, login_bg_y_offset),
  login_mobile_card_x_offset = COALESCE(login_mobile_card_x_offset, login_card_x_offset),
  login_mobile_card_y_offset = COALESCE(login_mobile_card_y_offset, login_card_y_offset),
  login_mobile_card_border_color = COALESCE(login_mobile_card_border_color, login_card_border_color),
  login_mobile_card_scale = COALESCE(login_mobile_card_scale, login_card_scale),
  login_mobile_show_logo = COALESCE(login_mobile_show_logo, login_show_logo),
  login_mobile_text_color = COALESCE(login_mobile_text_color, login_text_color),
  login_mobile_accent_color = COALESCE(login_mobile_accent_color, login_accent_color),
  login_mobile_logo_opacity = COALESCE(login_mobile_logo_opacity, login_logo_opacity);

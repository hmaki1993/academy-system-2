-- Run this in your Supabase SQL Editor to enable ALL Search Customization features including Text Color

ALTER TABLE gym_settings 
ADD COLUMN IF NOT EXISTS search_icon_color text DEFAULT 'rgba(255, 255, 255, 0.4)',
ADD COLUMN IF NOT EXISTS search_bg_color text DEFAULT 'rgba(255, 255, 255, 0.05)',
ADD COLUMN IF NOT EXISTS search_border_color text DEFAULT 'rgba(255, 255, 255, 0.1)',
ADD COLUMN IF NOT EXISTS search_text_color text DEFAULT '#ffffff';

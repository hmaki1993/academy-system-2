-- Add sidebar_bg_color column to gym_settings and user_settings
-- This allows the Theme Engine to persistently save the "Menu BG" color from the Palette Editor.

ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS sidebar_bg_color TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS sidebar_bg_color TEXT;

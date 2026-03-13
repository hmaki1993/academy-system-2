-- Add input background color to gym_settings
ALTER TABLE public.gym_settings 
ADD COLUMN IF NOT EXISTS input_bg_color TEXT DEFAULT '#0f172a';

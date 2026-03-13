-- Add hover color and hover border color to gym_settings
ALTER TABLE public.gym_settings 
ADD COLUMN IF NOT EXISTS hover_color TEXT DEFAULT 'rgba(16, 185, 129, 0.8)',
ADD COLUMN IF NOT EXISTS hover_border_color TEXT DEFAULT 'rgba(16, 185, 129, 0.3)';

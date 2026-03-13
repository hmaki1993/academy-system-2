-- Add new columns for enhanced styling
ALTER TABLE public.gym_settings 
ADD COLUMN IF NOT EXISTS border_radius text DEFAULT '1.5rem',
ADD COLUMN IF NOT EXISTS glass_opacity numeric DEFAULT 0.6;

-- Update existing row with defaults if needed
UPDATE public.gym_settings 
SET border_radius = '1.5rem', glass_opacity = 0.6
WHERE border_radius IS NULL;

ALTER TABLE public.gym_settings 
ADD COLUMN IF NOT EXISTS training_levels JSONB DEFAULT '[1, 2, 3, 4, 5, 6, 7, 8]';

COMMENT ON COLUMN public.gym_settings.training_levels IS 'Array of available training levels for the academy.';

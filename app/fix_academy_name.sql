-- FIX ACADEMY NAME TYPO
-- Updates the gym name from "HEALY GYMNASTIC" to "HEALY GYMNASTICS"

UPDATE public.gym_settings
SET gym_name = 'HEALY GYMNASTICS';

-- If you prefer the full name "HEALY GYMNASTICS ACADEMY", uncomment the line below:
-- UPDATE public.gym_settings SET gym_name = 'HEALY GYMNASTICS ACADEMY';

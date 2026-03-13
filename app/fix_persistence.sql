-- 1. FIX THEME SETTINGS (Missing Columns)
ALTER TABLE public.gym_settings 
ADD COLUMN IF NOT EXISTS hover_color TEXT DEFAULT 'rgba(16, 185, 129, 0.8)',
ADD COLUMN IF NOT EXISTS hover_border_color TEXT DEFAULT 'rgba(16, 185, 129, 0.3)';

-- 2. FIX PROFILE UPDATES (Permissions/RLS)
-- This allows you to save your name in the settings
DROP POLICY IF EXISTS "Allow users to upsert their own profile" ON public.profiles;
CREATE POLICY "Allow users to upsert their own profile" 
ON public.profiles 
FOR ALL 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

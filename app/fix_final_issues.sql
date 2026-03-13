-- COMPREHENSIVE FIX FOR RLS AND MISSING COLUMNS
-- Run this script to fix both the "permission denied" errors and "missing column" errors.

-- 1. FIX MISSING COLUMNS
DO $$
BEGIN
    -- Add pt_sessions_count to coach_attendance
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coach_attendance') THEN
        ALTER TABLE public.coach_attendance 
        ADD COLUMN IF NOT EXISTS pt_sessions_count INTEGER DEFAULT 0;
    END IF;

    -- Add sessions_count to pt_sessions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pt_sessions') THEN
        ALTER TABLE public.pt_sessions
        ADD COLUMN IF NOT EXISTS sessions_count INTEGER DEFAULT 1;
    END IF;
    
    -- Add image_pos columns to coaches just in case
    ALTER TABLE public.coaches
    ADD COLUMN IF NOT EXISTS image_pos_x FLOAT DEFAULT 0.5,
    ADD COLUMN IF NOT EXISTS image_pos_y FLOAT DEFAULT 0.2;
END $$;

-- 2. FIX RLS POLICIES FOR PROFILES (Prevent Recursion)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create helper function to check admin status safely (bypassing RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing restricted policies
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- Create a policy that allows Admins to manage profiles using the safe function
CREATE POLICY "Admins can manage all profiles" 
ON public.profiles
FOR ALL 
TO authenticated 
USING ( public.is_admin() )
WITH CHECK ( public.is_admin() );

-- Also allow users to read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- 3. FIX RLS FOR COACHES (Allow Admins to manage coaches)
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all coaches" ON public.coaches;
CREATE POLICY "Admins can manage all coaches" 
ON public.coaches
FOR ALL 
TO authenticated 
USING ( public.is_admin() )
WITH CHECK ( public.is_admin() );

-- Allow public read access to coaches (needed for landing pages etc)
DROP POLICY IF EXISTS "Public read access to coaches" ON public.coaches;
CREATE POLICY "Public read access to coaches" 
ON public.coaches
FOR SELECT 
USING (true);

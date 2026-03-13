 -- FIX MISSING TABLES
-- This script creates the missing 'coaches' and 'subscription_plans' tables
-- which are causing 404 errors in the frontend.

-- 1. Create subscription_plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    duration_months INTEGER NOT NULL,
    price DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for subscription_plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Allow read access to all users (authenticated and anon for registration)
CREATE POLICY "Allow read access to all users" ON public.subscription_plans FOR SELECT USING (true);

-- Allow admins to manage plans
CREATE POLICY "Allow admin full access" ON public.subscription_plans FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Seed default plans
INSERT INTO public.subscription_plans (name, duration_months, price) VALUES 
    ('Monthly (1 Month)', 1, 0),
    ('Quarterly (3 Months)', 3, 0),
    ('Annual (1 Year)', 12, 0)
ON CONFLICT DO NOTHING;


-- 2. Create coaches table
CREATE TABLE IF NOT EXISTS public.coaches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    specialty TEXT DEFAULT 'General Coach',
    bio TEXT,
    role TEXT DEFAULT 'coach',
    pt_rate DECIMAL(10, 2) DEFAULT 0,
    salary DECIMAL(10, 2) DEFAULT 0,
    commission_rate DECIMAL(5, 2) DEFAULT 0,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT coaches_profile_id_key UNIQUE (profile_id)
);

-- Enable RLS for coaches
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

-- Allow read access to all users
CREATE POLICY "Allow read access to all users" ON public.coaches FOR SELECT USING (true);

-- Allow coaches to update their own profile
CREATE POLICY "Coaches can update own profile" ON public.coaches FOR UPDATE TO authenticated USING (
    auth.uid() = profile_id OR 
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Allow admins to manage coaches
CREATE POLICY "Admins can manage coaches" ON public.coaches FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- 3. Sync existing profiles to coaches table
-- This ensures any coach profiles created are also in the coaches table
INSERT INTO public.coaches (profile_id, full_name, email, role)
SELECT id, full_name, email, role
FROM public.profiles
WHERE role IN ('coach', 'head_coach')
AND id NOT IN (SELECT profile_id FROM public.coaches WHERE profile_id IS NOT NULL)
ON CONFLICT (profile_id) DO NOTHING;

-- 4. Enable Realtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'subscription_plans') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_plans;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'coaches') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.coaches;
  END IF;
END $$;

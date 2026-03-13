-- COMPREHENSIVE FULL SCHEMA FIX (FINAL V8)
-- This script fixes ALL: Students, PT, Payments, Schedules, and COACH ATTENDANCE.
-- Simplified policies to avoid conflicts.

-- 1. Create/Fix 'coach_attendance' (CRITICAL FIX FOR STATUS COLUMN)
CREATE TABLE IF NOT EXISTS public.coach_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID REFERENCES public.coaches(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    pt_sessions_count INTEGER DEFAULT 0,
    note TEXT,
    status TEXT DEFAULT 'present',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if table already exists
ALTER TABLE public.coach_attendance 
ADD COLUMN IF NOT EXISTS note TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'present',
ADD COLUMN IF NOT EXISTS pt_sessions_count INTEGER DEFAULT 0;

-- Enable RLS and set policies
ALTER TABLE public.coach_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_read" ON public.coach_attendance;
CREATE POLICY "allow_all_read" ON public.coach_attendance FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_auth_write" ON public.coach_attendance;
CREATE POLICY "allow_auth_write" ON public.coach_attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Create/Fix 'training_groups'
CREATE TABLE IF NOT EXISTS public.training_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
    schedule JSONB DEFAULT '[]'::jsonb, 
    schedule_key TEXT, 
    capacity INTEGER DEFAULT 20,
    level TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.training_groups ADD COLUMN IF NOT EXISTS schedule_key TEXT;
ALTER TABLE public.training_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_read_groups" ON public.training_groups;
CREATE POLICY "allow_all_read_groups" ON public.training_groups FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_auth_write_groups" ON public.training_groups;
CREATE POLICY "allow_auth_write_groups" ON public.training_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Create/Fix 'pt_subscriptions'
CREATE TABLE IF NOT EXISTS public.pt_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
    student_name TEXT,
    student_phone TEXT,
    sessions_total INTEGER DEFAULT 0,
    sessions_remaining INTEGER DEFAULT 0,
    start_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE,
    total_price DECIMAL(10, 2) DEFAULT 0,
    price_per_session DECIMAL(10, 2) DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pt_subscriptions
ADD COLUMN IF NOT EXISTS student_phone TEXT,
ADD COLUMN IF NOT EXISTS expiry_date DATE,
ADD COLUMN IF NOT EXISTS price_per_session DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS student_name TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

ALTER TABLE public.pt_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_read_pt" ON public.pt_subscriptions;
CREATE POLICY "allow_all_read_pt" ON public.pt_subscriptions FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_auth_write_pt" ON public.pt_subscriptions;
CREATE POLICY "allow_auth_write_pt" ON public.pt_subscriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Fix Students Table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS contact_number TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'male',
ADD COLUMN IF NOT EXISTS subscription_plan_id UUID,
ADD COLUMN IF NOT EXISTS training_group_id UUID,
ADD COLUMN IF NOT EXISTS subscription_expiry DATE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS coach_id UUID;

-- 5. Fix Payments Table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS payment_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id) ON DELETE SET NULL;

-- 6. Force Schema Refresh
DO $$ 
BEGIN 
    EXECUTE 'COMMENT ON TABLE public.coach_attendance IS ''Refreshed: ' || NOW() || '''';
    EXECUTE 'COMMENT ON TABLE public.students IS ''Refreshed: ' || NOW() || '''';
END $$;

-- 7. Reload PostgREST
NOTIFY pgrst, 'reload';

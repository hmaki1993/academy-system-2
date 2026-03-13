-- FIX SCRIPT FOR MISSING TABLES AND COLUMNS (Revised)
-- This script safely creates missing tables, columns, and policies.

-- 1. Add missing position columns to Coaches table
ALTER TABLE public.coaches
ADD COLUMN IF NOT EXISTS image_pos_x FLOAT DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS image_pos_y FLOAT DEFAULT 0.2;

-- 2. Create PT Subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.pt_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
    sessions_total INTEGER NOT NULL DEFAULT 10,
    sessions_remaining INTEGER NOT NULL DEFAULT 10,
    total_price DECIMAL(10, 2) DEFAULT 0,
    expiry_date DATE,
    status TEXT DEFAULT 'active', -- active, expired, completed
    student_name TEXT, -- Fallback if student_id is null (guest)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Coach Attendance table if it doesn't exist
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

-- Force add missing columns if table already exists
ALTER TABLE public.coach_attendance
ADD COLUMN IF NOT EXISTS pt_sessions_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS note TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'present';

-- 4. Create PT Sessions (Daily Log) table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.pt_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID REFERENCES public.coaches(id) ON DELETE CASCADE,
    student_name TEXT,
    sessions_count INTEGER DEFAULT 1,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Force add missing columns if table already exists
ALTER TABLE public.pt_sessions
ADD COLUMN IF NOT EXISTS sessions_count INTEGER DEFAULT 1;

-- 5. Fix relationship between Students and Coaches
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL;

-- 6. Enable RLS for all new tables
ALTER TABLE public.pt_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_sessions ENABLE ROW LEVEL SECURITY;

-- 7. Create Policies (Drop first to avoid errors)
-- PT Subscriptions
DROP POLICY IF EXISTS "Allow read access to all users" ON public.pt_subscriptions;
CREATE POLICY "Allow read access to all users" ON public.pt_subscriptions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins/Coaches full access" ON public.pt_subscriptions;
CREATE POLICY "Admins/Coaches full access" ON public.pt_subscriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Coach Attendance
DROP POLICY IF EXISTS "Allow read access to all users" ON public.coach_attendance;
CREATE POLICY "Allow read access to all users" ON public.coach_attendance FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins/Coaches full access" ON public.coach_attendance;
CREATE POLICY "Admins/Coaches full access" ON public.coach_attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PT Sessions
DROP POLICY IF EXISTS "Allow read access to all users" ON public.pt_sessions;
CREATE POLICY "Allow read access to all users" ON public.pt_sessions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins/Coaches full access" ON public.pt_sessions;
CREATE POLICY "Admins/Coaches full access" ON public.pt_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. Enable Realtime for all tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'pt_subscriptions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pt_subscriptions;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'coach_attendance') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.coach_attendance;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'pt_sessions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pt_sessions;
  END IF;
END $$;

-- 9. Create missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_pt_subscriptions_student_id ON public.pt_subscriptions(student_id);
CREATE INDEX IF NOT EXISTS idx_pt_subscriptions_coach_id ON public.pt_subscriptions(coach_id);
CREATE INDEX IF NOT EXISTS idx_students_coach_id ON public.students(coach_id);

-- 10. Force Cache Refresh
DO $$ 
BEGIN 
    EXECUTE 'COMMENT ON TABLE public.coach_attendance IS ''Coach attendance records (Updated: ' || NOW() || ')''';
END $$;
NOTIFY pgrst, 'reload';

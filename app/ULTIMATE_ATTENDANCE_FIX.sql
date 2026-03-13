-- ==========================================
-- ULTIMATE ATTENDANCE FIX (SCHEMA & RLS)
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Ensure Table Structure
CREATE TABLE IF NOT EXISTS public.coach_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID REFERENCES public.coaches(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    check_in_time TIMESTAMPTZ DEFAULT NOW(),
    check_out_time TIMESTAMPTZ,
    status TEXT DEFAULT 'present',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Fix Constraints (Crucial for UPSERT)
-- If this fails or doesn't exist, Supabase returns 400 Bad Request
ALTER TABLE public.coach_attendance DROP CONSTRAINT IF EXISTS coach_attendance_coach_id_date_key;
ALTER TABLE public.coach_attendance ADD CONSTRAINT coach_attendance_coach_id_date_key UNIQUE (coach_id, date);

-- 3. Fix Broken RLS Policies (Security)
-- The old policy was checking coach_id = auth.uid(), but coach_id is NOT the Profile ID.
ALTER TABLE public.coach_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches can insert own attendance" ON public.coach_attendance;
DROP POLICY IF EXISTS "Coaches can update own attendance" ON public.coach_attendance;
DROP POLICY IF EXISTS "Admins manage coach attendance" ON public.coach_attendance;
DROP POLICY IF EXISTS "Enable access for all authenticated users" ON public.coach_attendance;

-- SECURE POLICY: Check if the coach_id belongs to the logged-in user via profile_id
CREATE POLICY "Coaches manage own attendance" ON public.coach_attendance
FOR ALL TO authenticated
USING (
    coach_id IN (SELECT id FROM public.coaches WHERE profile_id = auth.uid())
)
WITH CHECK (
    coach_id IN (SELECT id FROM public.coaches WHERE profile_id = auth.uid())
);

-- ADMIN POLICY: Staff can view/edit everything
CREATE POLICY "Staff view all attendance" ON public.coach_attendance
FOR SELECT TO authenticated
USING (TRUE);

CREATE POLICY "Admins manage everything" ON public.coach_attendance
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'head_coach', 'reception')
    )
);

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload schema';

SELECT 'Attendance Fix Applied! ✅' as status;

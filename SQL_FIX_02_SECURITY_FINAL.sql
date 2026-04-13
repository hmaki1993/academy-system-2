-- ============================================================
-- SQL_FIX_02_SECURITY_FINAL: Fine-Grained Role-Based Access (RLS)
-- ============================================================

-- helper function to check roles
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- [1] STUDENTS Policies
DROP POLICY IF EXISTS "open_access_students" ON public.students;
DROP POLICY IF EXISTS "open_read_students" ON public.students;
DROP POLICY IF EXISTS "Enable all for authenticated" ON public.students;
DROP POLICY IF EXISTS "Admins/Reception Manage All Students" ON public.students;
DROP POLICY IF EXISTS "Coaches Manage Own Students" ON public.students;

-- Admins & Reception: Full Access
CREATE POLICY "Admins/Reception Manage All Students" 
ON public.students FOR ALL 
USING (public.get_auth_role() IN ('admin', 'reception'))
WITH CHECK (public.get_auth_role() IN ('admin', 'reception'));

-- Coaches: See and Update only THEIR students
CREATE POLICY "Coaches Manage Own Students" 
ON public.students FOR ALL 
USING (
    public.get_auth_role() = 'coach' 
    AND (coach_id = auth.uid() OR id IN (SELECT student_id FROM public.pt_subscriptions WHERE coach_id = auth.uid()))
)
WITH CHECK (
    public.get_auth_role() = 'coach' 
    AND (coach_id = auth.uid() OR id IN (SELECT student_id FROM public.pt_subscriptions WHERE coach_id = auth.uid()))
);

-- [2] FINANCE (Payments/Expenses/Refunds)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authenticated" ON public.payments;
DROP POLICY IF EXISTS "Enable all for authenticated" ON public.expenses;
DROP POLICY IF EXISTS "Enable all for authenticated" ON public.refunds;
DROP POLICY IF EXISTS "Finance Management restricted to Admin/Reception" ON public.payments;
DROP POLICY IF EXISTS "Expenses Management restricted to Admin/Reception" ON public.expenses;
DROP POLICY IF EXISTS "Refunds Management restricted to Admin/Reception" ON public.refunds;

-- Only Admins & Reception can see/manage finance
CREATE POLICY "Finance Management restricted to Admin/Reception" 
ON public.payments FOR ALL 
USING (public.get_auth_role() IN ('admin', 'reception'));

CREATE POLICY "Expenses Management restricted to Admin/Reception" 
ON public.expenses FOR ALL 
USING (public.get_auth_role() IN ('admin', 'reception'));

CREATE POLICY "Refunds Management restricted to Admin/Reception" 
ON public.refunds FOR ALL 
USING (public.get_auth_role() IN ('admin', 'reception'));

-- [3] COACH ATTENDANCE
-- Coaches can read their own attendance, Admins see all
DROP POLICY IF EXISTS "Coaches view own attendance" ON public.coach_attendance;
CREATE POLICY "Coaches view own attendance" 
ON public.coach_attendance FOR SELECT 
USING (coach_id = auth.uid() OR public.get_auth_role() = 'admin');

-- [4] GYM SETTINGS
-- Only Admins can edit gym settings
DROP POLICY IF EXISTS "Enable all for authenticated" ON public.gym_settings;
DROP POLICY IF EXISTS "Admin manage gym settings" ON public.gym_settings;
DROP POLICY IF EXISTS "Authenticated users view gym settings" ON public.gym_settings;
CREATE POLICY "Admin manage gym settings" 
ON public.gym_settings FOR ALL 
USING (public.get_auth_role() = 'admin');

CREATE POLICY "Authenticated users view gym settings" 
ON public.gym_settings FOR SELECT 
TO authenticated 
USING (true);

-- ============================================================
-- VERIFICATION: Run this to see active policies
-- ============================================================
-- SELECT tablename, policyname, roles, cmd, qualifier FROM pg_policies WHERE schemaname = 'public';

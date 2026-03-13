-- ============================================================
-- FIX BACKEND ISSUES: RLS SECURITY & DATABASE INDEXES
-- Run this script in your Supabase SQL Editor
-- ============================================================

-- ==========================================
-- PART 1: ADDING MISSING INDEXES (PERFORMANCE)
-- ==========================================
-- These indexes will dramatically speed up the app as it scales.

-- Students & Profiles
CREATE INDEX IF NOT EXISTS idx_students_coach_id ON public.students(coach_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Groups & Relations
CREATE INDEX IF NOT EXISTS idx_groups_coach_id ON public.groups(coach_id);
CREATE INDEX IF NOT EXISTS idx_student_groups_student_id ON public.student_groups(student_id);
CREATE INDEX IF NOT EXISTS idx_student_groups_group_id ON public.student_groups(group_id);

-- Subscriptions & Attendance
CREATE INDEX IF NOT EXISTS idx_subscriptions_student_id ON public.subscriptions(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_coach_attendance_coach_id ON public.coach_attendance(coach_id);

-- Finance
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_refunds_student_id ON public.refunds(student_id);

-- PT Sessions
CREATE INDEX IF NOT EXISTS idx_pt_subscriptions_student_id ON public.pt_subscriptions(student_id);
CREATE INDEX IF NOT EXISTS idx_pt_subscriptions_coach_id ON public.pt_subscriptions(coach_id);
CREATE INDEX IF NOT EXISTS idx_pt_attendance_pt_sub_id ON public.pt_attendance(pt_subscription_id);

-- Communications (Crucial for Chat Speed)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_convo_id ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_call_records_conversation_id ON public.call_records(conversation_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);


-- ==========================================
-- PART 2: FIXING DANGEROUS RLS POLICIES
-- ==========================================

-- Helper function to safely get the current user's role without recursion
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

-- 1. Drop existing dangerous open policies for core tables
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN (
        'students', 'groups', 'student_groups', 'subscriptions', 'subscription_plans',
        'attendance', 'coach_attendance', 'payments', 'expenses', 'refunds',
        'pt_subscriptions', 'pt_attendance'
    )
    AND policyname = 'Enable all for authenticated'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 2. Create Secure Policies

-- -- STUDENTS & GROUPS -- --
-- Everyone authenticated can SELECT (View)
CREATE POLICY "Enable SELECT for authenticated" ON public.students FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Enable SELECT for authenticated" ON public.groups FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Enable SELECT for authenticated" ON public.student_groups FOR SELECT TO authenticated USING (TRUE);

-- Only Admins, Reception, and Coaches can INSERT/UPDATE/DELETE Students & Groups
CREATE POLICY "Enable WRITE for staff" ON public.students FOR ALL TO authenticated 
USING (public.get_my_role() IN ('admin', 'reception', 'head_coach', 'coach'))
WITH CHECK (public.get_my_role() IN ('admin', 'reception', 'head_coach', 'coach'));

CREATE POLICY "Enable WRITE for staff" ON public.groups FOR ALL TO authenticated 
USING (public.get_my_role() IN ('admin', 'reception', 'head_coach', 'coach'));

CREATE POLICY "Enable WRITE for staff" ON public.student_groups FOR ALL TO authenticated 
USING (public.get_my_role() IN ('admin', 'reception', 'head_coach', 'coach'));


-- -- ATTENDANCE -- --
CREATE POLICY "Enable SELECT for authenticated" ON public.attendance FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Enable SELECT for authenticated" ON public.coach_attendance FOR SELECT TO authenticated USING (TRUE);

-- Staff can manage student attendance
CREATE POLICY "Enable WRITE for staff on attendance" ON public.attendance FOR ALL TO authenticated 
USING (public.get_my_role() IN ('admin', 'reception', 'head_coach', 'coach'));

-- Users can insert their own coach attendance, Admins/Reception can view/edit all
CREATE POLICY "Coaches can insert own attendance" ON public.coach_attendance FOR INSERT TO authenticated 
WITH CHECK (coach_id = auth.uid());
CREATE POLICY "Coaches can update own attendance" ON public.coach_attendance FOR UPDATE TO authenticated 
USING (coach_id = auth.uid());
CREATE POLICY "Admins manage coach attendance" ON public.coach_attendance FOR ALL TO authenticated 
USING (public.get_my_role() IN ('admin', 'reception'));


-- -- FINANCE (Payments, Expenses, Refunds, Subscriptions) -- --
-- Only Admin & Reception can manage Finance. Coaches can only SELECT.
CREATE POLICY "Enable SELECT for authenticated" ON public.payments FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Enable SELECT for authenticated" ON public.expenses FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Enable SELECT for authenticated" ON public.refunds FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Enable SELECT for authenticated" ON public.subscriptions FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Enable SELECT for authenticated" ON public.subscription_plans FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Enable WRITE for Finance Admins" ON public.payments FOR ALL TO authenticated 
USING (public.get_my_role() IN ('admin', 'reception'))
WITH CHECK (public.get_my_role() IN ('admin', 'reception'));

CREATE POLICY "Enable WRITE for Finance Admins" ON public.expenses FOR ALL TO authenticated 
USING (public.get_my_role() IN ('admin', 'reception'));

CREATE POLICY "Enable WRITE for Finance Admins" ON public.refunds FOR ALL TO authenticated 
USING (public.get_my_role() IN ('admin', 'reception'));

CREATE POLICY "Enable WRITE for Finance Admins" ON public.subscriptions FOR ALL TO authenticated 
USING (public.get_my_role() IN ('admin', 'reception'));

CREATE POLICY "Enable WRITE for Finance Admins" ON public.subscription_plans FOR ALL TO authenticated 
USING (public.get_my_role() IN ('admin', 'admin')); -- Only admin for plans


-- -- PT SESSIONS -- --
CREATE POLICY "Enable SELECT for authenticated" ON public.pt_subscriptions FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Enable SELECT for authenticated" ON public.pt_attendance FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Enable WRITE for staff" ON public.pt_subscriptions FOR ALL TO authenticated 
USING (public.get_my_role() IN ('admin', 'reception', 'head_coach', 'coach'));

CREATE POLICY "Enable WRITE for staff" ON public.pt_attendance FOR ALL TO authenticated 
USING (public.get_my_role() IN ('admin', 'reception', 'head_coach', 'coach'));

-- Force Schema Cache Reload for PostgREST
NOTIFY pgrst, 'reload schema';

SELECT 'Backend Security and Performance Fixes applied successfully! ✅' AS status;

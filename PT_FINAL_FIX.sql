-- ============================================================
-- PT SYSTEM FINAL DATABASE FIX (Policies & Schema)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Ensure pt_bookings table has all required columns
ALTER TABLE IF EXISTS public.pt_bookings ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.pt_bookings ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.pt_bookings ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE IF EXISTS public.pt_bookings ADD COLUMN IF NOT EXISTS amount NUMERIC(10,3);
ALTER TABLE IF EXISTS public.pt_bookings ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE IF EXISTS public.pt_bookings ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Open up RLS for Students to read Coaches (Critical for Booking Page)
DROP POLICY IF EXISTS "Public coaches read" ON public.coaches;
CREATE POLICY "Public coaches read" ON public.coaches FOR SELECT USING (true);

-- 3. Fix pt_bookings policies for the new Student view
DROP POLICY IF EXISTS "pt_bookings_select_own" ON public.pt_bookings;
CREATE POLICY "pt_bookings_select_own" ON public.pt_bookings FOR SELECT USING (
    student_id = auth.uid() 
    OR coach_id IN (SELECT id FROM public.coaches WHERE profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'head_coach', 'reception', 'student'))
);

-- 4. Ensure students can book (Insert)
DROP POLICY IF EXISTS "pt_bookings_insert_all" ON public.pt_bookings;
CREATE POLICY "pt_bookings_insert_all" ON public.pt_bookings FOR INSERT WITH CHECK (true);

-- 5. Open pt_availability for reading (So students see time slots)
DROP POLICY IF EXISTS "pt_availability_read_all" ON public.pt_availability;
CREATE POLICY "pt_availability_read_all" ON public.pt_availability FOR SELECT USING (true);

-- 6. Ensure Notifications table is visible to students
DROP POLICY IF EXISTS "Notifications access for all" ON public.notifications;
CREATE POLICY "Notifications access for all" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- 7. Log out and reload PostgREST cache
NOTIFY pgrst, 'reload';

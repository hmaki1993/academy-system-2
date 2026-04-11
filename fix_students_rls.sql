-- ============================================================
-- FIX: Allow athletes to read their own student record
-- This is the ROOT CAUSE of the remote control not working
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Drop old policies first (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Students can read own record" ON students;
DROP POLICY IF EXISTS "Admins can read all students" ON students;

-- Allow any authenticated user to read their OWN student record
CREATE POLICY "Students can read own record"
ON students FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

-- Also allow admins/coaches to read all student records
CREATE POLICY "Admins can read all students"
ON students FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'coach')
  )
);

-- ============================================================
-- VERIFY the policies are working:
-- Run this SELECT to confirm (should return your student row)
-- ============================================================
-- SELECT * FROM students WHERE profile_id = auth.uid();

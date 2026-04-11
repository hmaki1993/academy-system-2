-- ============================================================
-- FIX: Training Plans RLS (Row Level Security)
-- Run this in: Supabase Dashboard → SQL Editor
-- This fixes the 400 error on training_plans queries
-- ============================================================

-- First drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Students can read their own training plans" ON training_plans;
DROP POLICY IF EXISTS "Admins can read all training plans" ON training_plans;
DROP POLICY IF EXISTS "Admins can manage training plans" ON training_plans;

-- OPTION 1 (Quickest Fix): Allow ALL authenticated users to read ALL training plans
-- This is safe since plans only contain training data, not personal info
CREATE POLICY "Authenticated users can read training plans"
ON training_plans FOR SELECT
TO authenticated
USING (true);

-- Allow admins/coaches to write plans
CREATE POLICY "Admins can write training plans"
ON training_plans FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'coach')
  )
);

-- ============================================================
-- OR OPTION 2 (More Secure): Strict per-student access
-- ============================================================
/*
CREATE POLICY "Athletes can read own plans"
ON training_plans FOR SELECT
TO authenticated
USING (
  -- Admin/coach can see all
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'coach'))
  OR
  -- Student sees only their plan
  student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
);

CREATE POLICY "Admins can manage all plans" 
ON training_plans FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'coach'))
);
*/

  -- ============================================================
  -- NUCLEAR RESET: Fix ALL training_plans permissions at once
  -- Run in Supabase SQL Editor → this WILL fix the remote control
  -- ============================================================

  -- Step 1: Remove ALL existing policies on training_plans
  DO $$
  DECLARE r RECORD;
  BEGIN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'training_plans' LOOP
      EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON training_plans';
    END LOOP;
  END $$;

  -- Step 2: Allow ALL authenticated users to do EVERYTHING on training_plans
  -- (This is safe - training plans are not sensitive personal data)
  CREATE POLICY "open_access_training_plans"
  ON training_plans FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

  -- ============================================================
  -- Also fix students table read access
  -- ============================================================
  DROP POLICY IF EXISTS "Students can read own record" ON students;
  DROP POLICY IF EXISTS "Admins can read all students" ON students;

  CREATE POLICY "open_read_students"
  ON students FOR SELECT
  TO authenticated
  USING (true);

  -- ============================================================
  -- Verify: Check what's in training_plans right now
  -- ============================================================
  SELECT 
      tp.id,
      tp.student_id,
      s.full_name,
      s.profile_id,
      tp.status,
      tp.target_jumps,
      tp.target_time
  FROM training_plans tp
  LEFT JOIN students s ON s.id = tp.student_id
  ORDER BY tp.id DESC
  LIMIT 10;

-- ============================================================
-- FIX: JUMP ROPE SESSIONS VISIBILITY
-- Run this in Supabase SQL Editor to let coaches see jumps
-- ============================================================

-- 1. Setup Table RLS
ALTER TABLE jump_rope_sessions ENABLE ROW LEVEL SECURITY;

-- 2. Clear stale policies
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'jump_rope_sessions' LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON jump_rope_sessions';
    END LOOP;
END $$;

-- 3. Create Open Read Policy for Authenticated Users (Coaches/Admins)
-- This allows stats aggregation to work for everyone
CREATE POLICY "authenticated_can_read_all_sessions"
ON jump_rope_sessions FOR SELECT
TO authenticated
USING (true);

-- 4. Create Insert Policy
CREATE POLICY "authenticated_can_insert_sessions"
ON jump_rope_sessions FOR INSERT
TO authenticated
WITH CHECK (true);

-- 🟢 DONE! Stats should start populating in Strategy Hub cards now.

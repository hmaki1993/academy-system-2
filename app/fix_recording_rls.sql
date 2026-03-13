-- Enable RLS
ALTER TABLE pt_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pt_sessions ENABLE ROW LEVEL SECURITY;

-- 1. Allow Coaches to UPDATE their own subscriptions (decrement sessions)
DROP POLICY IF EXISTS "Coaches can update own subscriptions" ON pt_subscriptions;
CREATE POLICY "Coaches can update own subscriptions"
ON pt_subscriptions
FOR UPDATE
USING (
  coach_id IN (
    SELECT id FROM coaches WHERE profile_id = auth.uid()
  )
)
WITH CHECK (
  coach_id IN (
    SELECT id FROM coaches WHERE profile_id = auth.uid()
  )
);

-- 2. Allow Coaches to INSERT into pt_sessions (record session)
DROP POLICY IF EXISTS "Coaches can record sessions" ON pt_sessions;
CREATE POLICY "Coaches can record sessions"
ON pt_sessions
FOR INSERT
WITH CHECK (
  coach_id IN (
    SELECT id FROM coaches WHERE profile_id = auth.uid()
  )
);

-- 3. Allow Coaches to SELECT their own sessions (history)
DROP POLICY IF EXISTS "Coaches can view own sessions" ON pt_sessions;
CREATE POLICY "Coaches can view own sessions"
ON pt_sessions
FOR SELECT
USING (
  coach_id IN (
    SELECT id FROM coaches WHERE profile_id = auth.uid()
  )
);

-- 4. Allow Coaches to DELETE their own sessions (reset/refund)
DROP POLICY IF EXISTS "Coaches can delete own sessions" ON pt_sessions;
CREATE POLICY "Coaches can delete own sessions"
ON pt_sessions
FOR DELETE
USING (
  coach_id IN (
    SELECT id FROM coaches WHERE profile_id = auth.uid()
  )
);

-- 5. Admin & Head Coach Overrides for pt_sessions
-- Using direct profile check instead of get_user_role function
DROP POLICY IF EXISTS "Admins and Head Coaches manage sessions" ON pt_sessions;
CREATE POLICY "Admins and Head Coaches manage sessions"
ON pt_sessions
FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role IN ('admin', 'head_coach')
  )
);

-- 6. Also allow Admins/Head Coaches full control on subscriptions for safety
DROP POLICY IF EXISTS "Admins and Head Coaches full control on subscriptions" ON pt_subscriptions;
CREATE POLICY "Admins and Head Coaches full control on subscriptions"
ON pt_subscriptions
FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role IN ('admin', 'head_coach')
  )
);

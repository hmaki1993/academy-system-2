-- 1. Unblock the 'coaches' table
-- If the frontend cannot read the 'coaches' table, the Coach code fails to find the ID and returns nothing.
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON coaches;
DROP POLICY IF EXISTS "Authenticated users can select coaches" ON coaches;

CREATE POLICY "Authenticated users can select coaches"
ON coaches FOR SELECT
TO authenticated
USING (true);

-- 2. Unblock 'profiles' table (needed for role checks in policies)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- 3. Re-affirm PT Subscriptions Policies
ALTER TABLE pt_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and Head Coaches can do everything" ON pt_subscriptions;
DROP POLICY IF EXISTS "Coaches can view own subscriptions" ON pt_subscriptions;
DROP POLICY IF EXISTS "Reception can view all subscriptions" ON pt_subscriptions;
DROP POLICY IF EXISTS "Staff view all" ON pt_subscriptions;

-- Unified Policy for Viewers (Admin, Head Coach, Reception)
CREATE POLICY "Staff view all"
ON pt_subscriptions FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role IN ('admin', 'head_coach', 'reception', 'receptionist')
  )
);

-- Policy for Coaches (Own data)
CREATE POLICY "Coaches view own"
ON pt_subscriptions FOR SELECT
USING (
  coach_id IN (
    SELECT id FROM coaches WHERE profile_id = auth.uid()
  )
);

-- Policy for Admin/Head Coach Modification (Insert/Update/Delete)
CREATE POLICY "Admins/Head Coach modify"
ON pt_subscriptions
FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role IN ('admin', 'head_coach')
  )
);

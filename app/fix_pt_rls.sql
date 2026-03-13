-- Enable RLS on pt_subscriptions if not already enabled
ALTER TABLE pt_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins and Head Coaches can do everything" ON pt_subscriptions;
DROP POLICY IF EXISTS "Coaches can view own subscriptions" ON pt_subscriptions;
DROP POLICY IF EXISTS "Reception can view all subscriptions" ON pt_subscriptions;

-- Policy 1: Admin and Head Coach - Full Access
CREATE POLICY "Admins and Head Coaches can do everything"
ON pt_subscriptions
FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role IN ('admin', 'head_coach')
  )
);

-- Policy 2: Reception - View Only (Select)
CREATE POLICY "Reception can view all subscriptions"
ON pt_subscriptions
FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role IN ('reception', 'receptionist')
  )
);

-- Policy 3: Coaches - View Own Assigned Subscriptions
-- Requires linking auth.uid() -> profile -> coach record -> coach_id
CREATE POLICY "Coaches can view own subscriptions"
ON pt_subscriptions
FOR SELECT
USING (
  coach_id IN (
    SELECT id FROM coaches WHERE profile_id = auth.uid()
  )
);

-- Fix Notifications RLS as well just in case
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert notifications"
ON notifications
FOR INSERT
WITH CHECK (true);

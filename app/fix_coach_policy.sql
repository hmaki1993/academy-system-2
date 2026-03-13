-- Enable RLS on coaches table if not already
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

-- 1. Allow users to read their own coach profile
DROP POLICY IF EXISTS "Users can view own coach profile" ON coaches;
CREATE POLICY "Users can view own coach profile"
ON coaches FOR SELECT
USING (auth.uid() = profile_id);

-- 2. Allow admins and head coaches to view all coaches
DROP POLICY IF EXISTS "Admins and Head Coaches can view all coaches" ON coaches;
CREATE POLICY "Admins and Head Coaches can view all coaches"
ON coaches FOR SELECT
USING (
  public.get_user_role(auth.uid()) IN ('admin', 'head_coach')
);

-- 3. Allow reception to view all coaches (for scheduling/booking)
DROP POLICY IF EXISTS "Reception can view all coaches" ON coaches;
CREATE POLICY "Reception can view all coaches"
ON coaches FOR SELECT
USING (
  public.get_user_role(auth.uid()) = 'reception'
);

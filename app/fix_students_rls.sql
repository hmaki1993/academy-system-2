-- The Students page does a JOIN with the 'students' table.
-- If the user cannot read the 'students' table, the query returns nothing or nulls.

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view students" ON students;
DROP POLICY IF EXISTS "Authenticated users can view students" ON students;

-- Allow all authenticated users (staff) to view students
-- This is necessary for the list in Students page and for the JOINs in PT Subscriptions
CREATE POLICY "Authenticated users can view students"
ON students FOR SELECT
TO authenticated
USING (true);

-- Ensure profiles are also readable (just in case)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;
CREATE POLICY "Authenticated users can view profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

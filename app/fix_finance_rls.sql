-- FIX FINANCE AND REGISTRATION RLS POLICIES
-- This script ensures that the 'payments' table is correctly accessible and
-- public registration can record both students and payments.

-- 1. ENABLE RLS ON PAYMENTS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 2. DROP OLD POLICIES TO AVOID CONFLICTS
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.payments;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.payments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.payments;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.payments;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can delete payments" ON public.payments;

-- 3. CREATE POLICIES FOR AUTHENTICATED USERS (Admin, Coach, Reception)
CREATE POLICY "Enable read access for authenticated users"
ON public.payments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON public.payments FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
ON public.payments FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Enable delete for authenticated users"
ON public.payments FOR DELETE
TO authenticated
USING (true);

-- 4. ENABLE PUBLIC REGISTRATION (Anon Access)
-- Allowing anon to insert into students (if not already allowed by fix_reception_insert_permissions_v2.sql which only did authenticated)
DROP POLICY IF EXISTS "Enable insert for anon users" ON public.students;
CREATE POLICY "Enable insert for anon users"
ON public.students FOR INSERT
TO anon
WITH CHECK (true);

-- Allowing anon to insert into payments (for registration fee)
DROP POLICY IF EXISTS "Enable insert for anon users" ON public.payments;
CREATE POLICY "Enable insert for anon users"
ON public.payments FOR INSERT
TO anon
WITH CHECK (true);

-- 5. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';

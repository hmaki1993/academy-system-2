-- CHECK RLS POLICIES ON COACHES TABLE
-- This ensures the frontend can read the coach record

-- 1. Check existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'coaches';

-- 2. Ensure SELECT policy exists for authenticated users
DROP POLICY IF EXISTS "Coaches are viewable by authenticated users" ON public.coaches;

CREATE POLICY "Coaches are viewable by authenticated users"
ON public.coaches
FOR SELECT
TO authenticated
USING (true);

-- 3. Force cache refresh
DO $$ 
BEGIN 
    EXECUTE 'COMMENT ON TABLE public.coaches IS ''Fixed RLS: ' || NOW() || '''';
END $$;

NOTIFY pgrst, 'reload';

-- 4. Test the query that the frontend uses
SELECT 
    'TEST QUERY RESULT' as test,
    c.id,
    c.pt_rate,
    c.salary,
    c.profile_id
FROM public.coaches c
WHERE c.profile_id = '793a3126-f45b-4f4b-9b3a-22b4173db8f2'; -- This is mosa's profile_id

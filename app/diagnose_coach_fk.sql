-- VERIFY COACH EXISTS AND CHECK COACH_ATTENDANCE CONSTRAINT

-- 1. Check if the coach exists in coaches table
SELECT 
    'COACH EXISTS?' as check_type,
    c.id,
    c.email,
    c.full_name,
    c.profile_id
FROM public.coaches c
WHERE c.id = 'd5a7a8bc-98c5-4820-b66b-098d2d8bde9a';

-- 2. Check the foreign key constraint details
SELECT
    'FOREIGN KEY CONSTRAINT' as check_type,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'coach_attendance'
AND kcu.column_name = 'coach_id';

-- 3. Check data type of coach_id in both tables
SELECT 
    'COACH_ATTENDANCE coach_id TYPE' as check_type,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'coach_attendance'
AND column_name = 'coach_id';

SELECT 
    'COACHES id TYPE' as check_type,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'coaches'
AND column_name = 'id';

-- 4. Try to insert a test record
INSERT INTO public.coach_attendance (coach_id, date, check_in_time, status)
VALUES ('d5a7a8bc-98c5-4820-b66b-098d2d8bde9a', CURRENT_DATE, NOW(), 'present')
ON CONFLICT (coach_id, date) DO UPDATE
SET check_in_time = NOW(),
    status = 'present'
RETURNING *;

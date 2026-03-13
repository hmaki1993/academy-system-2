-- CHECK IF COACH EXISTS IN COACHES TABLE

-- 1. Check if this specific coach exists
SELECT 
    'COACH EXISTS?' as check_type,
    c.*
FROM public.coaches c
WHERE c.id = 'd5a7a8bc-98c5-4820-b66b-098d2d8bde9a';

-- 2. List all coaches to see what IDs exist
SELECT 
    'ALL COACHES' as check_type,
    c.id,
    c.email,
    c.full_name,
    c.profile_id
FROM public.coaches c
ORDER BY c.email;

-- 3. Check if there's a coach with the profile_id we're looking for
SELECT 
    'COACH BY PROFILE_ID' as check_type,
    c.id,
    c.email,
    c.full_name,
    c.profile_id
FROM public.coaches c
WHERE c.profile_id = '793a3126-f45b-4f4b-9b3a-22b4173db8f2'; -- mosa's profile_id

-- 4. Check the data type of coaches.id
SELECT 
    'COACHES.ID DATA TYPE' as check_type,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'coaches'
AND column_name = 'id';

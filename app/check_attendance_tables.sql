-- CHECK WHAT ATTENDANCE TABLES EXIST

-- 1. List all tables with 'attendance' in the name
SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_name LIKE '%attendance%'
AND table_schema = 'public'
ORDER BY table_name;

-- 2. Check columns in coach_attendance (we know this exists)
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'coach_attendance'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check if there's a student check-in table with a different name
SELECT 
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND (
    table_name LIKE '%student%'
    OR table_name LIKE '%check%'
    OR table_name LIKE '%session%'
)
ORDER BY table_name;

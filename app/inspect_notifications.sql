-- Inspect notifications table
SELECT 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name = 'notifications';

-- Check RLS policies
SELECT 
    policyname,
    cmd as operation,
    roles
FROM pg_policies
WHERE tablename = 'notifications';

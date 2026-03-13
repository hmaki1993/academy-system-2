-- Inspect pt_sessions table definition
SELECT 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name = 'pt_sessions';

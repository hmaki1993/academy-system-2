-- ============================================================================
-- DIAGNOSTIC SCRIPT: WHY CAN'T I DELETE STUDENTS?
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '=== 1. CHECKING ALL FOREIGN KEYS REFERENCING STUDENTS ===';
END $$;

SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    a.attname as column_name,
    confrelid::regclass as foreign_table_name,
    CASE confdeltype
        WHEN 'a' THEN 'NO ACTION'
        WHEN 'r' THEN 'RESTRICT'
        WHEN 'c' THEN 'CASCADE'
        WHEN 'n' THEN 'SET NULL'
        WHEN 'd' THEN 'SET DEFAULT'
        ELSE confdeltype::text
    END as delete_rule,
    CASE 
        WHEN confdeltype = 'c' THEN '✅ OK'
        ELSE '❌ BLOCKING'
    END as status
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
WHERE confrelid = 'public.students'::regclass
AND contype = 'f';

DO $$ 
BEGIN
    RAISE NOTICE ' ';
    RAISE NOTICE '=== 2. CHECKING TRIGGERS ON STUDENTS TABLE ===';
    RAISE NOTICE '(Triggers can sometimes block deletion)';
END $$;

SELECT 
    tgname as trigger_name,
    tgtype,
    CASE WHEN tgenabled = 'O' THEN 'ENABLED' ELSE 'DISABLED' END as status
FROM pg_trigger
WHERE tgrelid = 'public.students'::regclass
AND NOT tgisinternal;

DO $$ 
BEGIN
    RAISE NOTICE ' ';
    RAISE NOTICE '=== 3. CHECKING RLS POLICIES ON STUDENTS ===';
END $$;

SELECT 
    policyname,
    cmd as operation,
    roles
FROM pg_policies
WHERE tablename = 'students';

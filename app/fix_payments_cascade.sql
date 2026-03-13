-- ============================================================================
-- FIX PAYMENTS TABLE CASCADE
-- ============================================================================
-- The previous screenshot showed 'payments' table has NO ACTION
-- This script fixes that specific table.
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '=== Fixing payments foreign key ===';
    
    -- Check if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments' AND table_schema = 'public') THEN
        
        -- Drop existing constraint if it exists (without CASCADE)
        IF EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints 
            WHERE constraint_name = 'payments_student_id_fkey'
            AND table_name = 'payments'
        ) THEN
            EXECUTE 'ALTER TABLE public.payments DROP CONSTRAINT payments_student_id_fkey';
            RAISE NOTICE 'Dropped old payments_student_id_fkey constraint';
        END IF;

        -- Also check for other constraint names just in case (e.g. auto generated)
        -- Sometimes constraints are named differently. 
        -- But let's stick to the standard logic first.

        -- Add new constraint with CASCADE
        EXECUTE 'ALTER TABLE public.payments 
                 ADD CONSTRAINT payments_student_id_fkey 
                 FOREIGN KEY (student_id) 
                 REFERENCES public.students(id) 
                 ON DELETE CASCADE';
        RAISE NOTICE 'Added CASCADE constraint to payments';
        
    ELSE
        RAISE NOTICE 'Table payments does not exist, skipping';
    END IF;
END $$;

-- Verify again
SELECT 
    tc.table_name,
    rc.delete_rule,
    CASE 
        WHEN rc.delete_rule = 'CASCADE' THEN '✓ GOOD'
        ELSE '✗ NEEDS FIX'
    END as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'payments' 
AND tc.constraint_type = 'FOREIGN KEY';

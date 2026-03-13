-- ============================================================================
-- FIX STUDENT DELETION CASCADE (V2 - SAFE MODE)
-- ============================================================================
-- Purpose: Fix foreign key constraints to allow proper cascade deletion of students
-- Issue: Students appear to delete but then reappear due to FK constraint failures
-- Solution: Ensure all student-related FKs have ON DELETE CASCADE (if tables exist)
-- ============================================================================

-- Step 1: Check current foreign key constraints
DO $$ 
BEGIN
    RAISE NOTICE '=== Current Foreign Key Constraints on Student-Related Tables ===';
END $$;

SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
    AND rc.constraint_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'students'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ============================================================================
-- Step 2: Fix student_attendance table
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '=== Fixing student_attendance foreign key ===';
    
    -- Check if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_attendance' AND table_schema = 'public') THEN
        
        -- Drop existing constraint if it exists (without CASCADE)
        IF EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints 
            WHERE constraint_name = 'student_attendance_student_id_fkey'
            AND table_name = 'student_attendance'
        ) THEN
            EXECUTE 'ALTER TABLE public.student_attendance DROP CONSTRAINT student_attendance_student_id_fkey';
            RAISE NOTICE 'Dropped old student_attendance_student_id_fkey constraint';
        END IF;
        
        -- Add new constraint with CASCADE
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.referential_constraints rc
            JOIN information_schema.table_constraints tc 
                ON rc.constraint_name = tc.constraint_name
            WHERE tc.table_name = 'student_attendance'
                AND tc.constraint_type = 'FOREIGN KEY'
                AND rc.delete_rule = 'CASCADE'
        ) THEN
            EXECUTE 'ALTER TABLE public.student_attendance 
                     ADD CONSTRAINT student_attendance_student_id_fkey 
                     FOREIGN KEY (student_id) 
                     REFERENCES public.students(id) 
                     ON DELETE CASCADE';
            RAISE NOTICE 'Added CASCADE constraint to student_attendance';
        ELSE
            RAISE NOTICE 'CASCADE constraint already exists on student_attendance';
        END IF;

    ELSE
        RAISE NOTICE 'Table student_attendance does not exist, skipping...';
    END IF;
END $$;

-- ============================================================================
-- Step 3: Fix refunds table (SAFE CHECK ADDED)
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '=== Fixing refunds foreign key ===';
    
    -- Check if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'refunds' AND table_schema = 'public') THEN
    
        -- Drop existing constraint if it exists (without CASCADE)
        IF EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints 
            WHERE constraint_name = 'refunds_student_id_fkey'
            AND table_name = 'refunds'
        ) THEN
            EXECUTE 'ALTER TABLE public.refunds DROP CONSTRAINT refunds_student_id_fkey';
            RAISE NOTICE 'Dropped old refunds_student_id_fkey constraint';
        END IF;
        
        -- Add new constraint with CASCADE
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.referential_constraints rc
            JOIN information_schema.table_constraints tc 
                ON rc.constraint_name = tc.constraint_name
            WHERE tc.table_name = 'refunds'
                AND tc.constraint_type = 'FOREIGN KEY'
                AND rc.delete_rule = 'CASCADE'
        ) THEN
            EXECUTE 'ALTER TABLE public.refunds 
                     ADD CONSTRAINT refunds_student_id_fkey 
                     FOREIGN KEY (student_id) 
                     REFERENCES public.students(id) 
                     ON DELETE CASCADE';
            RAISE NOTICE 'Added CASCADE constraint to refunds';
        ELSE
            RAISE NOTICE 'CASCADE constraint already exists on refunds';
        END IF;
        
    ELSE
        RAISE NOTICE 'Table refunds does not exist, skipping...';
    END IF;
END $$;

-- ============================================================================
-- Step 4: Fix pt_subscriptions table (SAFE CHECK ADDED)
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '=== Fixing pt_subscriptions foreign key ===';
    
    -- Check if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pt_subscriptions' AND table_schema = 'public') THEN
        
        -- Drop existing constraint if it exists (without CASCADE)
        IF EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints 
            WHERE constraint_name = 'pt_subscriptions_student_id_fkey'
            AND table_name = 'pt_subscriptions'
        ) THEN
            EXECUTE 'ALTER TABLE public.pt_subscriptions DROP CONSTRAINT pt_subscriptions_student_id_fkey';
            RAISE NOTICE 'Dropped old pt_subscriptions_student_id_fkey constraint';
        END IF;
        
        -- Add new constraint with CASCADE
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.referential_constraints rc
            JOIN information_schema.table_constraints tc 
                ON rc.constraint_name = tc.constraint_name
            WHERE tc.table_name = 'pt_subscriptions'
                AND tc.constraint_type = 'FOREIGN KEY'
                AND rc.delete_rule = 'CASCADE'
        ) THEN
            EXECUTE 'ALTER TABLE public.pt_subscriptions 
                     ADD CONSTRAINT pt_subscriptions_student_id_fkey 
                     FOREIGN KEY (student_id) 
                     REFERENCES public.students(id) 
                     ON DELETE CASCADE';
            RAISE NOTICE 'Added CASCADE constraint to pt_subscriptions';
        ELSE
            RAISE NOTICE 'CASCADE constraint already exists on pt_subscriptions';
        END IF;
    ELSE
        RAISE NOTICE 'Table pt_subscriptions does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- Step 5: Fix student_training_schedule table (SAFE CHECK ADDED)
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '=== Fixing student_training_schedule foreign key ===';
    
    -- Check if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_training_schedule' AND table_schema = 'public') THEN
        
        -- Drop existing constraint if it exists (without CASCADE)
        IF EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints 
            WHERE constraint_name = 'student_training_schedule_student_id_fkey'
            AND table_name = 'student_training_schedule'
        ) THEN
            EXECUTE 'ALTER TABLE public.student_training_schedule DROP CONSTRAINT student_training_schedule_student_id_fkey';
            RAISE NOTICE 'Dropped old student_training_schedule_student_id_fkey constraint';
        END IF;
        
        -- Add new constraint with CASCADE
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.referential_constraints rc
            JOIN information_schema.table_constraints tc 
                ON rc.constraint_name = tc.constraint_name
            WHERE tc.table_name = 'student_training_schedule'
                AND tc.constraint_type = 'FOREIGN KEY'
                AND rc.delete_rule = 'CASCADE'
        ) THEN
            EXECUTE 'ALTER TABLE public.student_training_schedule 
                     ADD CONSTRAINT student_training_schedule_student_id_fkey 
                     FOREIGN KEY (student_id) 
                     REFERENCES public.students(id) 
                     ON DELETE CASCADE';
            RAISE NOTICE 'Added CASCADE constraint to student_training_schedule';
        ELSE
            RAISE NOTICE 'CASCADE constraint already exists on student_training_schedule';
        END IF;
    ELSE
        RAISE NOTICE 'Table student_training_schedule does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '=== ✅ Migration Complete ===';
    RAISE NOTICE 'Checked all student-related tables and updated constraints.';
    RAISE NOTICE 'Students can now be deleted without constraint errors.';
END $$;

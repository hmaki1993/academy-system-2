-- ============================================================================
-- ADD SUBSCRIPTION_ID TO PT_SESSIONS
-- ============================================================================
-- Issue: The 'pt_sessions' table is missing the 'subscription_id' column, causing errors 
-- when recording a session from the dashboard.
-- Solution: Add the column and link it to pt_subscriptions table.
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '=== Adding subscription_id column to pt_sessions ===';
    
    -- 1. Add column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pt_sessions' 
        AND column_name = 'subscription_id'
    ) THEN
        EXECUTE 'ALTER TABLE public.pt_sessions ADD COLUMN subscription_id UUID';
        RAISE NOTICE 'Added subscription_id column';
    ELSE
        RAISE NOTICE 'Column subscription_id already exists';
    END IF;

    -- 2. Add foreign key constraint (SAFE CHECK)
    -- We use ON DELETE CASCADE to match the rest of the system's logic (delete student -> delete everything)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'pt_sessions_subscription_id_fkey'
        AND table_name = 'pt_sessions'
    ) THEN
        EXECUTE 'ALTER TABLE public.pt_sessions 
                 ADD CONSTRAINT pt_sessions_subscription_id_fkey 
                 FOREIGN KEY (subscription_id) 
                 REFERENCES public.pt_subscriptions(id) 
                 ON DELETE CASCADE';
        RAISE NOTICE 'Added FK constraint: pt_sessions -> pt_subscriptions (CASCADE)';
    ELSE
        RAISE NOTICE 'Constraint pt_sessions_subscription_id_fkey already exists';
    END IF;

END $$;

-- Verify
SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'pt_sessions' 
AND column_name = 'subscription_id';

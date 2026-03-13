-- ============================================================================
-- DIAGNOSE REALTIME SETUP
-- ============================================================================

DO $$
DECLARE
    pub_count INT;
    table_in_pub BOOLEAN;
BEGIN
    RAISE NOTICE '=== DIAGNOSING REALTIME CONFIGURATION ===';

    -- 1. Check if publication exists
    SELECT COUNT(*) INTO pub_count FROM pg_publication WHERE pubname = 'supabase_realtime';
    
    IF pub_count > 0 THEN
        RAISE NOTICE '✅ Publication "supabase_realtime" exists.';
    ELSE
        RAISE NOTICE '❌ Publication "supabase_realtime" MISSING!';
    END IF;

    -- 2. Check if notifications table is in publication
    SELECT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'notifications'
    ) INTO table_in_pub;

    IF table_in_pub THEN
        RAISE NOTICE '✅ Table "notifications" is correctly linked to Realtime.';
    ELSE
        RAISE NOTICE '❌ Table "notifications" is NOT linked to Realtime. Attempting to fix...';
        
        -- Attempt to add it
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
        
        -- Check again
        SELECT EXISTS (
            SELECT 1 
            FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND tablename = 'notifications'
        ) INTO table_in_pub;
        
        IF table_in_pub THEN
            RAISE NOTICE '✅ Fixed! Table "notifications" added to Realtime.';
        ELSE
            RAISE NOTICE '❌ FAILED to add table even after command. Something is wrong.';
        END IF;
    END IF;

    -- 3. Check Replica Identity (Crucial for DELETE/UPDATE events)
    -- Default is usually fine for inserts, but FULL is safer for realtime
    RAISE NOTICE 'checking replica identity...';
    EXECUTE 'ALTER TABLE public.notifications REPLICA IDENTITY FULL';
    RAISE NOTICE '✅ Set REPLICA IDENTITY FULL for notifications.';

    -- 4. Send a test notification to verify flow
    INSERT INTO public.notifications (title, message, type, user_id)
    VALUES ('System Diagnosis 🛠️', 'Realtime verification log at ' || now(), 'info', NULL);
    
    RAISE NOTICE '✅ Sent test notification. Check if it appears in the app.';

END $$;

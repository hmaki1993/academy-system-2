-- ============================================================================
-- FIX SCHEMA CACHE & PERMISSIONS
-- ============================================================================
-- The error "PGRST205: Could not find the table 'public.refunds' in the schema cache"
-- means the Supabase API is out of sync with the database.
-- We will run a dummy DDL command to force a cache refresh and ensure permissions.
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '=== Refreshing Schema Cache ===';

    -- 1. Force Schema Cache Reload (by causing a schema change)
    NOTIFY pgrst, 'reload config'; -- This is the standard way to reload PostgREST config
    
    -- Alternative force method: Comment on table
    COMMENT ON TABLE public.refunds IS 'Refunds table - Cache Refreshed';
    COMMENT ON TABLE public.notifications IS 'Notifications table - Cache Refreshed';

    -- 2. Ensure Permissions (Just in case)
    GRANT ALL ON public.refunds TO postgres;
    GRANT ALL ON public.refunds TO anon;
    GRANT ALL ON public.refunds TO authenticated;
    GRANT ALL ON public.refunds TO service_role;

    GRANT ALL ON public.notifications TO postgres;
    GRANT ALL ON public.notifications TO anon;
    GRANT ALL ON public.notifications TO authenticated;
    GRANT ALL ON public.notifications TO service_role;
    
    RAISE NOTICE '✅ Permissions granted and schema cache refresh triggered.';

    -- 3. Verify Table Existence
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'refunds') THEN
        RAISE NOTICE '✅ Table "public.refunds" exists in database.';
    ELSE
        RAISE NOTICE '❌ Table "public.refunds" DOES NOT EXIST in database!';
    END IF;

END $$;

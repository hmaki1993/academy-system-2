-- ============================================================================
-- DEBUG: TEMPORARILY DISABLE RLS ON NOTIFICATIONS
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== DISABLING RLS FOR DEBUGGING ===';

    -- 1. Disable RLS on the table
    ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE '⚠️ RLS DISABLED on public.notifications';

    -- 2. Send a test notification
    INSERT INTO public.notifications (title, message, type, user_id)
    VALUES (
        'Debug Mode 🔓', 
        'RLS is currently DISABLED. If you see this, the issue was the Security Policy.', 
        'warning', 
        NULL
    );

    RAISE NOTICE '✅ Sent test notification with RLS OFF.';
    RAISE NOTICE '👉 Check your app now. If it works, tell me immediately!';

END $$;

-- ============================================================================
-- FINAL NOTIFICATION CONFIGURATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== CONFIGURING FINAL NOTIFICATION SECURITY ===';

    -- 1. Re-enable RLS (Safety First)
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
    
    -- 2. Drop existing policies to start fresh
    DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.notifications;
    DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.notifications;
    DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.notifications;
    DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.notifications;

    -- 3. Create the CORRECT Read Policy
    -- This policy allows users to see:
    -- A. Notifications sent specifically to them (user_id = auth.uid())
    -- B. Global notifications (user_id IS NULL) - THIS WAS THE MISSING LINK
    CREATE POLICY "Enable read access for authenticated users" 
    ON public.notifications FOR SELECT 
    TO authenticated 
    USING (
        auth.uid() = user_id 
        OR 
        user_id IS NULL 
    );

    -- 4. Allow Inserts (for System/Admin actions)
    CREATE POLICY "Enable insert access for authenticated users" 
    ON public.notifications FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

    -- 5. Allow Updates (Mark as read)
    CREATE POLICY "Enable update access for authenticated users" 
    ON public.notifications FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = user_id OR user_id IS NULL);

    -- 6. Allow Deletes (Clear notifications)
    CREATE POLICY "Enable delete access for authenticated users" 
    ON public.notifications FOR DELETE 
    TO authenticated 
    USING (auth.uid() = user_id OR user_id IS NULL);

    RAISE NOTICE '✅ RLS Re-enabled and Policies configured correctly.';
    
    -- 7. Send Final Confirmation Notification
    INSERT INTO public.notifications (title, message, type, user_id)
    VALUES (
        'System Secured 🔒', 
        'Security policies are active and configured correctly. You are good to go! 🚀', 
        'check_in', 
        NULL
    );

END $$;

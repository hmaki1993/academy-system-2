-- ============================================================================
-- FIX NOTIFICATION POLICIES
-- ============================================================================
-- Issue: The previous RLS policy only allowed users to see notifications where
-- user_id = auth.uid(). This blocked "Global" notifications where user_id is NULL.
-- Solution: Update the policy to allow user_id = auth.uid() OR user_id IS NULL.
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '=== Fixing Notification Policies ===';

    -- 1. Drop the old restrictive policy
    DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
    
    -- 2. Create the corrected policy
    CREATE POLICY "Users can view their own notifications" 
    ON public.notifications FOR SELECT 
    TO authenticated 
    USING (
        auth.uid() = user_id  -- Own notifications
        OR 
        user_id IS NULL       -- Global notifications
    );
    
    RAISE NOTICE '✅ Policy updated to allow global notifications.';

    -- 3. Verify Publication again (Just in case)
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

EXCEPTION
    WHEN duplicate_object THEN NULL; -- Ignore if table already in publication
END $$;

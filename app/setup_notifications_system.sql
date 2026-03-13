-- ============================================================================
-- CREATE NOTIFICATIONS TABLE & POLICIES
-- ============================================================================
-- Issue: The notifications system is not working. The table might be missing or have no policies.
-- Solution: Create the table and add RLS policies.
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '=== Setting up Notifications System ===';

    -- 1. Create Table if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
        CREATE TABLE public.notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
            link TEXT,
            is_read BOOLEAN DEFAULT FALSE,
            related_student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Created table: notifications';
    ELSE
        RAISE NOTICE 'Table notifications already exists';
    END IF;

    -- 2. Enable RLS
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

    -- 3. Create Policies

    -- Policy: Users can view their own notifications
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can view their own notifications') THEN
        CREATE POLICY "Users can view their own notifications" 
        ON public.notifications FOR SELECT 
        TO authenticated 
        USING (auth.uid() = user_id);
        RAISE NOTICE 'Created policy: View own notifications';
    END IF;

    -- Policy: Users can update their own notifications (e.g. mark as read)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can update their own notifications') THEN
        CREATE POLICY "Users can update their own notifications" 
        ON public.notifications FOR UPDATE
        TO authenticated 
        USING (auth.uid() = user_id);
        RAISE NOTICE 'Created policy: Update own notifications';
    END IF;

    -- Policy: System/Admins can insert notifications
    -- For simplicity, we allow any authenticated user to insert for now (to trigger notifications from client side logic if needed)
    -- Ideally this should be server-side only or restricted to specific roles.
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Authenticated users can insert notifications') THEN
        CREATE POLICY "Authenticated users can insert notifications" 
        ON public.notifications FOR INSERT
        TO authenticated 
        WITH CHECK (true);
        RAISE NOTICE 'Created policy: Insert notifications';
    END IF;

    -- 4. Enable Realtime
    -- Check if table is in realtime publication (Supabase specific, minimal check via SQL is hard, 
    -- but usually 'supabase_realtime' publication needs the table)
    -- run this command in SQL Editor: 
    -- alter publication supabase_realtime add table notifications;
    
END $$;

-- 5. Force Realtime Enablement (Try to add to publication)
DO $$
BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
EXCEPTION
    WHEN duplicate_object THEN NULL; -- Ignore if already exists
    WHEN OTHERS THEN RAISE NOTICE 'Could not add to realtime publication (might not exist)';
END $$;

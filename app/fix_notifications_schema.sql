-- ============================================================================
-- FIX NOTIFICATIONS SCHEMA & POLICIES
-- ============================================================================

DO $$
BEGIN
    -- 1. Force Reset: Drop table to ensure clean slate with all columns
    DROP TABLE IF EXISTS public.notifications CASCADE;

    -- 2. Create the table with ALL columns expected by Frontend
    CREATE TABLE public.notifications (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info', -- 'student', 'payment', 'schedule', 'coach', 'check_in', 'check_out', 'attendance_absence', 'pt_subscription'
        is_read BOOLEAN DEFAULT FALSE,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for global/role-based
        target_role TEXT, -- 'admin', 'coach', 'reception', etc.
        related_coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
        related_student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- 3. Enable RLS
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

    -- 4. Create Policies

    -- A. READ Policy
    -- Users can see notifications if:
    -- 1. It is assigned to them directly (user_id = auth.uid())
    -- 2. It is Global (user_id IS NULL AND target_role IS NULL)
    -- 3. It is targeted to their Role (NOT IMPLEMENTED IN SQL FULLY WITHOUT CLAIMS, SO WE OPEN GLOBAL FOR AUTHENTICATED)
    --    For now, we allow authenticated users to read ANY notification appearing in their query
    --    The Frontend filters by Role.
    CREATE POLICY "Enable read access for authenticated users" 
    ON public.notifications FOR SELECT 
    TO authenticated 
    USING (
        auth.uid() = user_id 
        OR 
        user_id IS NULL -- Global/Role-based
    );

    -- B. INSERT Policy
    -- Allow authenticated users (system actions) to insert notifications
    CREATE POLICY "Enable insert access for authenticated users" 
    ON public.notifications FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

    -- C. UPDATE Policy (Mark as read)
    CREATE POLICY "Enable update access for authenticated users" 
    ON public.notifications FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = user_id OR user_id IS NULL);

    -- D. DELETE Policy (Clear notifications)
    CREATE POLICY "Enable delete access for authenticated users" 
    ON public.notifications FOR DELETE 
    TO authenticated 
    USING (auth.uid() = user_id OR user_id IS NULL);

    -- 5. Grant Permissions
    GRANT ALL ON public.notifications TO postgres;
    GRANT ALL ON public.notifications TO anon;
    GRANT ALL ON public.notifications TO authenticated;
    GRANT ALL ON public.notifications TO service_role;

    -- 6. Ensure Publication for Realtime
    -- Check if 'supabase_realtime' exists, if not create it (rare)
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
    END IF;

    -- Add table to publication if not already added
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

    RAISE NOTICE '✅ Table "notifications" recreated with FULL SCHEMA and Policies.';
END $$;

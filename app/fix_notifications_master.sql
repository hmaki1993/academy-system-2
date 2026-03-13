-- MASTER NOTIFICATIONS FIX
-- This script consolidates all notification logic, fixes triggers, and repairs RLS/Realtime.

-- 1. REPAIR SCHEMA & CONSTRAINTS
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('student', 'payment', 'schedule', 'general', 'coach', 'check_in', 'attendance_absence', 'pt_subscription'));

-- Ensure columns exist for targeting
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_role TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_student_id UUID REFERENCES public.students(id) ON DELETE SET NULL;

-- 2. REPAIR RLS POLICIES
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to authenticated users" ON public.notifications;
DROP POLICY IF EXISTS "Allow insert access to authenticated users" ON public.notifications;
DROP POLICY IF EXISTS "Allow update access to authenticated users" ON public.notifications;
DROP POLICY IF EXISTS "Allow delete access to authenticated users" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own or global notifications" ON public.notifications;

-- Flexible policy: Users can see notifications targeted to them or global ones
CREATE POLICY "Users can view their own or global notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() 
    OR user_id IS NULL -- Global/Role-based
);

CREATE POLICY "Allow all actions for authenticated users"
ON public.notifications FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. TRIGGER FUNCTIONS

-- 3a. New Student Notification
CREATE OR REPLACE FUNCTION notify_new_student_v2()
RETURNS TRIGGER AS $$
DECLARE
    coach_profile_id UUID;
BEGIN
    -- Get coach's profile ID if assigned
    IF NEW.coach_id IS NOT NULL THEN
        SELECT profile_id INTO coach_profile_id FROM coaches WHERE id = NEW.coach_id;
    END IF;

    -- 1. General Notification (Visible to Admin/Reception/HeadCoach via frontend filtering)
    INSERT INTO public.notifications (title, message, type, related_student_id, related_coach_id)
    VALUES (
        'New Gymnast',
        NEW.full_name || ' just registered',
        'student',
        NEW.id,
        NEW.coach_id
    );

    -- 2. Targeted Notification for the specific coach (Personal)
    IF coach_profile_id IS NOT NULL THEN
        INSERT INTO public.notifications (title, message, type, related_student_id, related_coach_id, user_id)
        VALUES (
            'New Gymnast Assigned',
            NEW.full_name || ' has been assigned to you',
            'student',
            NEW.id,
            NEW.coach_id,
            coach_profile_id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3b. New Payment Notification
CREATE OR REPLACE FUNCTION notify_new_payment_v2()
RETURNS TRIGGER AS $$
DECLARE
    student_name TEXT;
BEGIN
    SELECT full_name INTO student_name FROM students WHERE id = NEW.student_id;
    
    INSERT INTO public.notifications (title, message, type, related_student_id, target_role)
    VALUES (
        'Payment Received',
        COALESCE(student_name, 'A gymnast') || ' paid ' || NEW.amount || ' KWD',
        'payment',
        NEW.student_id,
        'admin' -- Primarily for admin
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3c. Coach Attendance Notification (INSERT & UPDATE)
CREATE OR REPLACE FUNCTION notify_coach_attendance()
RETURNS TRIGGER AS $$
DECLARE
    coach_name TEXT;
BEGIN
    SELECT full_name INTO coach_name FROM coaches WHERE id = NEW.coach_id;
    coach_name := COALESCE(coach_name, 'Staff Member');

    -- Check-in
    IF NEW.check_in_time IS NOT NULL AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.check_in_time IS NULL)) THEN
        INSERT INTO public.notifications (title, message, type, related_coach_id, target_role)
        VALUES ('Staff Check-in', coach_name || ' has checked in 🟢', 'check_in', NEW.coach_id, 'head_coach');
        
        INSERT INTO public.notifications (title, message, type, related_coach_id, target_role)
        VALUES ('Staff Check-in', coach_name || ' has checked in 🟢', 'check_in', NEW.coach_id, 'reception');
    END IF;

    -- Check-out
    IF NEW.check_out_time IS NOT NULL AND (TG_OP = 'UPDATE' AND (OLD.check_out_time IS NULL OR OLD.check_out_time <> NEW.check_out_time)) THEN
        INSERT INTO public.notifications (title, message, type, related_coach_id, target_role)
        VALUES ('Staff Check-out', coach_name || ' has checked out 🔴', 'check_in', NEW.coach_id, 'head_coach');
        
        INSERT INTO public.notifications (title, message, type, related_coach_id, target_role)
        VALUES ('Staff Check-out', coach_name || ' has checked out 🔴', 'check_in', NEW.coach_id, 'reception');
    END IF;

    -- Absence
    IF NEW.status = 'absent' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'absent')) THEN
        INSERT INTO public.notifications (title, message, type, related_coach_id, target_role)
        VALUES ('Staff Absence', coach_name || ' marked absent ⚠️', 'attendance_absence', NEW.coach_id, 'head_coach');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3d. PT Subscription Notification
CREATE OR REPLACE FUNCTION notify_new_pt_subscription()
RETURNS TRIGGER AS $$
DECLARE
    student_name TEXT;
    coach_name TEXT;
    coach_profile_id UUID;
BEGIN
    IF NEW.student_id IS NOT NULL THEN
        SELECT full_name INTO student_name FROM students WHERE id = NEW.student_id;
    ELSE
        student_name := NEW.student_name;
    END IF;
    student_name := COALESCE(student_name, 'Guest Gymnast');

    SELECT full_name, profile_id INTO coach_name, coach_profile_id FROM coaches WHERE id = NEW.coach_id;

    -- 1. General Notification
    INSERT INTO public.notifications (title, message, type, related_student_id, related_coach_id)
    VALUES (
        'New PT Subscription',
        student_name || ' with ' || COALESCE(coach_name, 'Coach'),
        'pt_subscription',
        NEW.student_id,
        NEW.coach_id
    );

    -- 2. Targeted for Coach
    IF coach_profile_id IS NOT NULL THEN
        INSERT INTO public.notifications (title, message, type, related_student_id, related_coach_id, user_id)
        VALUES (
            'New PT Subscription',
            student_name || ' started PT with you',
            'pt_subscription',
            NEW.student_id,
            NEW.coach_id,
            coach_profile_id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RECREATE TRIGGERS
DROP TRIGGER IF EXISTS on_student_created ON public.students;
CREATE TRIGGER on_student_created AFTER INSERT ON public.students FOR EACH ROW EXECUTE FUNCTION notify_new_student_v2();

DROP TRIGGER IF EXISTS on_payment_created ON public.payments;
CREATE TRIGGER on_payment_created AFTER INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION notify_new_payment_v2();

DROP TRIGGER IF EXISTS on_coach_attendance_sync ON public.coach_attendance;
CREATE TRIGGER on_coach_attendance_sync AFTER INSERT OR UPDATE ON public.coach_attendance FOR EACH ROW EXECUTE FUNCTION notify_coach_attendance();

DROP TRIGGER IF EXISTS on_pt_subscription_created ON public.pt_subscriptions;
CREATE TRIGGER on_pt_subscription_created AFTER INSERT ON public.pt_subscriptions FOR EACH ROW EXECUTE FUNCTION notify_new_pt_subscription();

-- 5. ENABLE REALTIME
-- Check if table is already in publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
END $$;

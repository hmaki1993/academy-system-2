-- Add new columns to notifications table
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS related_coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS related_student_id UUID REFERENCES students(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS target_role TEXT; -- 'admin', 'head_coach', 'coach', 'reception', or null for broadcast

-- Update Notification Types check (if necessary, though Postgres CHECK constraints are hard to alter, we can just effectively ignore the old constraint if we didn't name it)
-- Usually better to drop and recreate constraint if we want to enforce it strict. 
-- For now, let's assume the existing check allows these or we don't need to enforce strictly yet.
-- Existing types: 'student', 'payment', 'schedule', 'general'
-- We need: 'coach', 'check_in', 'attendance_absence', 'pt_subscription'
-- Drop constraint if exists (assuming default name based on table/column)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('student', 'payment', 'schedule', 'general', 'coach', 'check_in', 'attendance_absence', 'pt_subscription'));

-- Allow delete access (for clearing notifications)
CREATE POLICY "Allow delete access to authenticated users"
ON notifications FOR DELETE
TO authenticated
USING (true);


-- 1. Trigger: New Student
-- Logic: Notify Admin/Reception (Broadcast/Target) + Assigned Coach
CREATE OR REPLACE FUNCTION notify_new_student_v2()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. General Notification (Boardcast/For Admin/Reception/HeadCoach)
    INSERT INTO public.notifications (title, message, type, related_student_id, related_coach_id, target_role)
    VALUES (
        'New Gymnast',
        NEW.full_name || ' just registered',
        'student',
        NEW.id,
        NEW.coach_id,
        NULL -- Visible to all who have permission to see 'student' types (Admin, Reception, Head Coach)
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_student_created ON students;
CREATE TRIGGER on_student_created
AFTER INSERT ON students
FOR EACH ROW
EXECUTE FUNCTION notify_new_student_v2();


-- 2. Trigger: New Payment
-- Logic: Notify Admin/Reception. NOT Head Coach (Finance Hidden). NOT Coach (Privacy).
CREATE OR REPLACE FUNCTION notify_new_payment_v2()
RETURNS TRIGGER AS $$
DECLARE
    student_name TEXT;
    student_coach_id UUID;
BEGIN
    SELECT full_name, coach_id INTO student_name, student_coach_id FROM students WHERE id = NEW.student_id;
    IF student_name IS NULL THEN student_name := 'Unknown Student'; END IF;

    -- Notify Admin & Reception (target_role could be used or just type filtering on frontend)
    INSERT INTO public.notifications (title, message, type, related_student_id, related_coach_id, target_role)
    VALUES (
        'Payment Received',
        NEW.amount || ' EGP from ' || student_name,
        'payment',
        NEW.student_id,
        student_coach_id,
        'admin_reception' -- Custom tag handled by frontend
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_payment_created ON payments;
CREATE TRIGGER on_payment_created
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION notify_new_payment_v2();


-- 3. Trigger: New Coach
-- Logic: Notify Head Coach
CREATE OR REPLACE FUNCTION notify_new_coach()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (title, message, type, related_coach_id, target_role)
    VALUES (
        'New Coach Joined',
        NEW.full_name || ' has been added to the team',
        'coach',
        NEW.id,
        'head_coach'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_coach_created ON coaches;
CREATE TRIGGER on_coach_created
AFTER INSERT ON coaches
FOR EACH ROW
EXECUTE FUNCTION notify_new_coach();


-- 4. Trigger: PT Subscription
-- Logic: Notify Admin, Head Coach, and Specific Coach
CREATE OR REPLACE FUNCTION notify_new_pt_subscription()
RETURNS TRIGGER AS $$
DECLARE
    student_name TEXT;
    coach_name TEXT;
BEGIN
    SELECT full_name INTO student_name FROM students WHERE id = NEW.student_id;
    SELECT full_name INTO coach_name FROM coaches WHERE id = NEW.coach_id;

    -- Notification for everyone concerned
    INSERT INTO public.notifications (title, message, type, related_student_id, related_coach_id)
    VALUES (
        'New PT Subscription',
        COALESCE(student_name, 'Student') || ' subscribed to PT with ' || COALESCE(coach_name, 'Coach'),
        'pt_subscription',
        NEW.student_id,
        NEW.coach_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_pt_subscription_created ON pt_subscriptions;
CREATE TRIGGER on_pt_subscription_created
AFTER INSERT ON pt_subscriptions
FOR EACH ROW
EXECUTE FUNCTION notify_new_pt_subscription();


-- 5. Trigger: Coach Attendance
-- Logic: Check-in / Absence -> Notify Head Coach
CREATE OR REPLACE FUNCTION notify_coach_attendance()
RETURNS TRIGGER AS $$
DECLARE
    coach_name TEXT;
BEGIN
    SELECT full_name INTO coach_name FROM coaches WHERE id = NEW.coach_id;

    -- Check-in
    IF NEW.check_in_time IS NOT NULL AND OLD.check_in_time IS NULL THEN
        INSERT INTO public.notifications (title, message, type, related_coach_id, target_role)
        VALUES (
            'Coach Check-in',
            COALESCE(coach_name, 'Coach') || ' has checked in',
            'check_in',
            NEW.coach_id,
            'head_coach'
        );
    END IF;

    -- Absence
    IF NEW.status = 'absent' AND (OLD.status IS DISTINCT FROM 'absent') THEN
        INSERT INTO public.notifications (title, message, type, related_coach_id, target_role)
        VALUES (
            'Coach Absence',
            COALESCE(coach_name, 'Coach') || ' marked as absent',
            'attendance_absence',
            NEW.coach_id,
            'head_coach'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_coach_attendance_update ON coach_attendance;
CREATE TRIGGER on_coach_attendance_update
AFTER UPDATE ON coach_attendance
FOR EACH ROW
EXECUTE FUNCTION notify_coach_attendance();


-- 6. RPC to Clear Notifications
CREATE OR REPLACE FUNCTION clear_notifications_for_user(user_id UUID, role_name TEXT)
RETURNS void AS $$
BEGIN
    -- If Admin or Head Coach can clear all? User said "Clear All". 
    -- But usually clear should only clear for THEM. 
    -- However, if notifications are shared rows, deleting them deletes for everyone.
    -- Ideally we mark 'read_by' array, but for simplicity/MVP request "cancel all":
    -- We'll DELETE notifications that are relevant to them.
    
    DELETE FROM notifications
    WHERE 
        -- If filter matches what they see, delete it.
        (role_name = 'admin') -- Admin clears everything?
        OR (role_name = 'head_coach' AND type IN ('coach', 'check_in', 'attendance_absence', 'pt_subscription', 'student'))
        OR (role_name = 'coach' AND related_coach_id::text = user_id::text) -- Coach clears their own
        OR (role_name = 'reception' AND type IN ('payment', 'student'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

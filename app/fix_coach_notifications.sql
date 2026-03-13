-- Fix Coach Notifications targeting specific user accounts

-- 1. Update notify_new_student_v2
CREATE OR REPLACE FUNCTION notify_new_student_v2()
RETURNS TRIGGER AS $$
DECLARE
    coach_profile_id UUID;
BEGIN
    -- Get coach's profile ID if assigned
    IF NEW.coach_id IS NOT NULL THEN
        SELECT profile_id INTO coach_profile_id FROM coaches WHERE id = NEW.coach_id;
    END IF;

    -- 1. General Notification (Broadcast for Admin/Reception/HeadCoach)
    -- This is still useful as a global record, but we target target_role
    INSERT INTO public.notifications (title, message, type, related_student_id, related_coach_id, target_role)
    VALUES (
        'New Gymnast',
        NEW.full_name || ' just registered',
        'student',
        NEW.id,
        NEW.coach_id,
        NULL -- Visible to Admin/Reception via type filter
    );

    -- 2. Targeted Notification for the specific coach
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


-- 2. Update notify_new_pt_subscription
CREATE OR REPLACE FUNCTION notify_new_pt_subscription()
RETURNS TRIGGER AS $$
DECLARE
    student_name TEXT;
    coach_name TEXT;
    coach_profile_id UUID;
BEGIN
    -- Handle Student Name (Registered or Guest)
    IF NEW.student_id IS NOT NULL THEN
        SELECT full_name INTO student_name FROM students WHERE id = NEW.student_id;
    ELSE
        student_name := NEW.student_name;
    END IF;

    IF student_name IS NULL THEN student_name := 'Guest Student'; END IF;

    -- Handle Coach details
    SELECT full_name, profile_id INTO coach_name, coach_profile_id FROM coaches WHERE id = NEW.coach_id;

    -- 1. General Notification
    INSERT INTO public.notifications (title, message, type, related_student_id, related_coach_id)
    VALUES (
        'New PT Subscription',
        student_name || ' subscribed to PT with ' || COALESCE(coach_name, 'Coach'),
        'pt_subscription',
        NEW.student_id,
        NEW.coach_id
    );

    -- 2. Targeted Notification for the specific coach
    IF coach_profile_id IS NOT NULL THEN
        INSERT INTO public.notifications (title, message, type, related_student_id, related_coach_id, user_id)
        VALUES (
            'New PT Subscription',
            student_name || ' has started a PT subscription with you',
            'pt_subscription',
            NEW.student_id,
            NEW.coach_id,
            coach_profile_id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

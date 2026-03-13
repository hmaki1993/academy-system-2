-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('student', 'payment', 'schedule', 'general')),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users (since this is a dashboard)
CREATE POLICY "Allow read access to authenticated users"
ON notifications FOR SELECT
TO authenticated
USING (true);

-- Allow insert access for triggers (implicitly handled by security definer functions usually, but helpful for testing)
CREATE POLICY "Allow insert access to authenticated users"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow update access (for marking as read)
CREATE POLICY "Allow update access to authenticated users"
ON notifications FOR UPDATE
TO authenticated
USING (true);

-- Enable Realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;


-- Trigger Function: Notify on New Student
CREATE OR REPLACE FUNCTION notify_new_student()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (title, message, type)
    VALUES (
        'New Gymnast',
        NEW.full_name || ' just registered',
        'student'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: New Student
DROP TRIGGER IF EXISTS on_student_created ON students;
CREATE TRIGGER on_student_created
AFTER INSERT ON students
FOR EACH ROW
EXECUTE FUNCTION notify_new_student();


-- Trigger Function: Notify on Payment
CREATE OR REPLACE FUNCTION notify_new_payment()
RETURNS TRIGGER AS $$
DECLARE
    student_name TEXT;
    notification_msg TEXT;
BEGIN
    -- Get student name if possible
    SELECT full_name INTO student_name FROM students WHERE id = NEW.student_id;
    
    IF student_name IS NULL THEN
        student_name := 'Unknown Student';
    END IF;

    notification_msg := 'Payment: ' || NEW.amount || ' EGP from ' || student_name;
    
    -- If there's a note, append part of it (custom logic)
    IF NEW.notes IS NOT NULL AND length(NEW.notes) > 0 THEN
         notification_msg := notification_msg || ' (' || NEW.notes || ')';
    END IF;

    INSERT INTO public.notifications (title, message, type)
    VALUES (
        'Payment Received',
        notification_msg,
        'payment'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: New Payment
DROP TRIGGER IF EXISTS on_payment_created ON payments;
CREATE TRIGGER on_payment_created
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION notify_new_payment();

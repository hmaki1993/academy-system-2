-- Add student_phone to pt_subscriptions
ALTER TABLE pt_subscriptions
ADD COLUMN IF NOT EXISTS student_phone TEXT;

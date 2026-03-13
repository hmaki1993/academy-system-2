-- Add student_email column to pt_subscriptions
ALTER TABLE public.pt_subscriptions ADD COLUMN IF NOT EXISTS student_email TEXT;

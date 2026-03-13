-- MASTER FIX FOR COACH ATTENDANCE & NOTIFICATIONS
-- Run this in your Supabase SQL Editor

-- 1. FIX SCHEMA
-- Ensure all required columns exist in coach_attendance
ALTER TABLE public.coach_attendance ADD COLUMN IF NOT EXISTS status text DEFAULT 'present';
ALTER TABLE public.coach_attendance ADD COLUMN IF NOT EXISTS note text;

-- Make check_in_time nullable (for absent markers) and remove problematic defaults
ALTER TABLE public.coach_attendance ALTER COLUMN check_in_time DROP DEFAULT;
ALTER TABLE public.coach_attendance ALTER COLUMN check_in_time DROP NOT NULL;

-- 2. FIX CONSTRAINTS
-- Upsert requires a unique constraint on the columns used in onConflict
ALTER TABLE IF EXISTS public.coach_attendance 
DROP CONSTRAINT IF EXISTS coach_attendance_coach_id_date_key;

ALTER TABLE public.coach_attendance 
ADD CONSTRAINT coach_attendance_coach_id_date_key UNIQUE (coach_id, date);

-- 3. FIX RLS POLICIES
-- Enable RLS and allow all authenticated staff to manage attendance
ALTER TABLE public.coach_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.coach_attendance;
DROP POLICY IF EXISTS "Coaches can manage their own attendance" ON public.coach_attendance;
DROP POLICY IF EXISTS "Admins and Reception can view all attendance" ON public.coach_attendance;

CREATE POLICY "Enable access for all authenticated users" 
ON public.coach_attendance 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 4. Notification Trigger Function
CREATE OR REPLACE FUNCTION notify_coach_attendance()
RETURNS TRIGGER AS $$
DECLARE
    coach_name TEXT;
BEGIN
    SELECT full_name INTO coach_name FROM coaches WHERE id = NEW.coach_id;
    coach_name := COALESCE(coach_name, 'Staff Member');

    -- Check-in (Insert or update from null check_in_time)
    IF NEW.check_in_time IS NOT NULL AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.check_in_time IS NULL)) THEN
        -- Notify Head Coach
        INSERT INTO public.notifications (title, message, type, related_coach_id, target_role, created_at)
        VALUES ('Staff Check-in', coach_name || ' has checked in 🟢', 'check_in', NEW.coach_id, 'head_coach', NOW());
        
        -- Notify Reception/Admin (Admin usually sees everything, but explicit is good)
        INSERT INTO public.notifications (title, message, type, related_coach_id, target_role, created_at)
        VALUES ('Staff Check-in', coach_name || ' has checked in 🟢', 'check_in', NEW.coach_id, 'reception', NOW());
    END IF;

    -- Check-out (Update sets check_out_time)
    IF NEW.check_out_time IS NOT NULL AND (TG_OP = 'UPDATE' AND (OLD.check_out_time IS NULL OR OLD.check_out_time <> NEW.check_out_time)) THEN
        -- Notify Head Coach
        INSERT INTO public.notifications (title, message, type, related_coach_id, target_role, created_at)
        VALUES ('Staff Check-out', coach_name || ' has checked out 🔴', 'check_in', NEW.coach_id, 'head_coach', NOW());
        
        -- Notify Reception/Admin
        INSERT INTO public.notifications (title, message, type, related_coach_id, target_role, created_at)
        VALUES ('Staff Check-out', coach_name || ' has checked out 🔴', 'check_in', NEW.coach_id, 'reception', NOW());
    END IF;

    -- Absence
    IF NEW.status = 'absent' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'absent')) THEN
        INSERT INTO public.notifications (title, message, type, related_coach_id, target_role, created_at)
        VALUES ('Staff Absence', coach_name || ' marked absent ⚠️', 'attendance_absence', NEW.coach_id, 'head_coach', NOW());
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_coach_attendance_sync ON public.coach_attendance;
CREATE TRIGGER on_coach_attendance_sync
AFTER INSERT OR UPDATE ON public.coach_attendance
FOR EACH ROW
EXECUTE FUNCTION notify_coach_attendance();

-- 5. UPGRADED NOTIFICATION PERMISSIONS & CONSTRAINTS
-- Ensure all required notification types are allowed in the database
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('student', 'payment', 'schedule', 'general', 'coach', 'check_in', 'attendance_absence', 'pt_subscription'));

-- 6. DATA REPAIR / SYNC
-- Link existing coaches to profiles by name/email (if not already linked)
UPDATE public.coaches c
SET profile_id = p.id
FROM public.profiles p
WHERE c.profile_id IS NULL
AND (
    LOWER(TRIM(c.full_name)) = LOWER(TRIM(p.full_name))
    OR LOWER(TRIM(c.email)) = LOWER(TRIM(p.email))
)
AND p.role IN ('coach', 'head_coach', 'reception', 'receptionist');

-- Insert missing coach records for staff profiles
INSERT INTO public.coaches (id, profile_id, full_name, role, pt_rate, salary)
SELECT 
    gen_random_uuid(), 
    id, 
    COALESCE(full_name, 'New Staff'), 
    role,
    0, 
    0
FROM 
    public.profiles
WHERE 
    role IN ('coach', 'head_coach', 'reception', 'receptionist')
    AND id NOT IN (SELECT profile_id FROM public.coaches WHERE profile_id IS NOT NULL);

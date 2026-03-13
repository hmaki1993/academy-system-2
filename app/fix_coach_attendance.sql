-- 1. Ensure Unique Constraint for UPSERT to work
-- This prevents multiple records for the same coach on the same day and allows "onConflict" to resolve correctly.
ALTER TABLE IF EXISTS public.coach_attendance 
DROP CONSTRAINT IF EXISTS coach_attendance_coach_id_date_key;

ALTER TABLE public.coach_attendance 
ADD CONSTRAINT coach_attendance_coach_id_date_key UNIQUE (coach_id, date);

-- 2. Fix RLS Policies for coach_attendance
-- Enable RLS
ALTER TABLE public.coach_attendance ENABLE ROW LEVEL SECURITY;

-- Drop existing broad policies to recreate them cleanly
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.coach_attendance;
DROP POLICY IF EXISTS "Coaches can manage their own attendance" ON public.coach_attendance;
DROP POLICY IF EXISTS "Admins and Reception can view all attendance" ON public.coach_attendance;

-- Policy: Allow all authenticated users to manage attendance records
-- This ensures Coaches can check in/out and Admins/Receptionists can see/update status.
CREATE POLICY "Enable all access for authenticated users" 
ON public.coach_attendance 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 3. Update Notification Trigger to handle INSERT + UPDATE
-- Previously it only fired on UPDATE, missing the first check-in of the day.
CREATE OR REPLACE FUNCTION notify_coach_attendance()
RETURNS TRIGGER AS $$
DECLARE
    coach_name TEXT;
BEGIN
    SELECT full_name INTO coach_name FROM coaches WHERE id = NEW.coach_id;

    -- CASE 1: NEW INSERT OR UPDATE with check_in_time
    -- Check-in (if check_in_time is set and OLD was null OR it's a fresh row)
    IF NEW.check_in_time IS NOT NULL AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.check_in_time IS NULL)) THEN
        INSERT INTO public.notifications (title, message, type, related_coach_id, target_role)
        VALUES (
            'Coach Check-in',
            COALESCE(coach_name, 'Coach') || ' has checked in',
            'check_in',
            NEW.coach_id,
            'head_coach'
        );
    END IF;

    -- CASE 2: Status marked as absent
    IF NEW.status = 'absent' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'absent')) THEN
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

-- Recreate trigger for both INSERT and UPDATE
DROP TRIGGER IF EXISTS on_coach_attendance_sync ON public.coach_attendance;
CREATE TRIGGER on_coach_attendance_sync
AFTER INSERT OR UPDATE ON public.coach_attendance
FOR EACH ROW
EXECUTE FUNCTION notify_coach_attendance();

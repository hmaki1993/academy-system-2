-- CLEAN UP INVALID COACH ATTENDANCE RECORDS
-- Remove any attendance records that reference non-existent coaches

-- 1. Delete invalid attendance records (orphaned records)
DELETE FROM public.coach_attendance
WHERE coach_id NOT IN (SELECT id FROM public.coaches);

-- 2. Verify the cleanup
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT coach_id) as unique_coaches
FROM public.coach_attendance;

-- 3. Show all valid attendance records
SELECT 
    ca.*,
    c.full_name as coach_name
FROM public.coach_attendance ca
LEFT JOIN public.coaches c ON ca.coach_id = c.id
ORDER BY ca.created_at DESC
LIMIT 20;

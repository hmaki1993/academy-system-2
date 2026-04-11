-- CHECK: Does the athlete exist in students table?
-- Run in Supabase SQL Editor

-- 1. Show ALL students with their profile_id
SELECT id, full_name, profile_id FROM students;

-- 2. Show ALL training_plans (to see what student_id is used)
SELECT id, student_id, status, target_jumps, target_time, updated_at FROM training_plans ORDER BY updated_at DESC LIMIT 10;

-- 3. Check if they match
SELECT 
    s.id as student_id,
    s.full_name,
    s.profile_id,
    tp.status,
    tp.target_jumps,
    tp.target_time,
    tp.updated_at
FROM students s
LEFT JOIN training_plans tp ON tp.student_id = s.id
ORDER BY tp.updated_at DESC;

-- SCRIPT TO CLEAR DEMO DATA
-- Runs safely to remove all students, finance, and groups data.
-- Allows you to start fresh with your own data.

-- 1. Clear Attendance & Subscriptions (Student Data)
DELETE FROM attendance;
DELETE FROM subscriptions;

-- 2. Clear Students (The "players" you see)
DELETE FROM students;

-- 3. Clear Groups
DELETE FROM groups;

-- 4. Clear Finance Data (Optional - usually good to clear for fresh start)
DELETE FROM payments;
DELETE FROM expenses;

-- 5. Clear Notifications (Skipped - table not found)
-- DELETE FROM notifications;

-- 6. Clear Coaches & Other Profiles (Keep Admin)
DELETE FROM profiles WHERE role != 'admin';

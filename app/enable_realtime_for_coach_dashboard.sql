-- Enable Supabase Realtime for tables used in Coach Dashboard
-- This allows real-time updates when admin makes changes

-- Enable realtime for training_groups table
ALTER PUBLICATION supabase_realtime ADD TABLE training_groups;

-- Enable realtime for students table
ALTER PUBLICATION supabase_realtime ADD TABLE students;

-- Enable realtime for pt_sessions table
ALTER PUBLICATION supabase_realtime ADD TABLE pt_sessions;

-- Enable realtime for coach_attendance table
ALTER PUBLICATION supabase_realtime ADD TABLE coach_attendance;

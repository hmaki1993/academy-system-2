-- Create Jump Rope Sessions table
CREATE TABLE IF NOT EXISTS public.jump_rope_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    jumps INTEGER NOT NULL DEFAULT 0,
    duration INTEGER NOT NULL DEFAULT 0, -- in seconds
    rpm INTEGER NOT NULL DEFAULT 0, -- average RPM
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.jump_rope_sessions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own sessions" 
ON public.jump_rope_sessions FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" 
ON public.jump_rope_sessions FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_jump_rope_sessions_user_id ON public.jump_rope_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_jump_rope_sessions_created_at ON public.jump_rope_sessions(created_at);

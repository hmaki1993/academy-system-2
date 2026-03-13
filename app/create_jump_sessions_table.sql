-- RUN THIS IN YOUR SUPABASE SQL EDITOR

CREATE TABLE IF NOT EXISTS public.jump_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    jump_count INTEGER DEFAULT 0,
    work_time INTEGER DEFAULT 0,
    rest_time INTEGER DEFAULT 0,
    jpm INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.jump_sessions ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their own jump sessions" ON public.jump_sessions;
CREATE POLICY "Users can view their own jump sessions" 
ON public.jump_sessions FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own jump sessions" ON public.jump_sessions;
CREATE POLICY "Users can insert their own jump sessions" 
ON public.jump_sessions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and Coaches can view all jump sessions" ON public.jump_sessions;
CREATE POLICY "Admins and Coaches can view all jump sessions"
ON public.jump_sessions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'coach')
  )
);

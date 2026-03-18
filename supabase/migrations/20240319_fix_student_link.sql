-- [1] Add user_id to students table to link them to Auth
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- [2] Fix jump_rope_sessions table to link user_id to profiles for easier joining
ALTER TABLE public.jump_rope_sessions 
DROP CONSTRAINT IF EXISTS jump_rope_sessions_user_id_fkey,
ADD CONSTRAINT jump_rope_sessions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- [3] Ensure RLS is updated for the new link
DROP POLICY IF EXISTS "Profiles readable by authenticated" ON public.profiles;
CREATE POLICY "Profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (TRUE);

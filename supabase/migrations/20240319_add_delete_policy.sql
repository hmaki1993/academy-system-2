-- Add DELETE policy for jump_rope_sessions
CREATE POLICY "Users can delete their own sessions" 
ON public.jump_rope_sessions FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

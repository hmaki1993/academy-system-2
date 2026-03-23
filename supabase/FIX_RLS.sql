-- Ensure users can delete their own sessions
DROP POLICY IF EXISTS "Users can delete their own jump rope sessions" ON jump_rope_sessions;

CREATE POLICY "Users can delete their own jump rope sessions" 
ON jump_rope_sessions 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

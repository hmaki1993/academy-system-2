-- ============================================================
-- COMMUNICATION SUITE - RLS Recursion Fix
-- Run this in Supabase SQL Editor to resolve 500 errors
-- ============================================================

-- 1. Create a security definer function to check membership
-- This avoids recursion because the function runs with the privileges 
-- of the creator (postgres) rather than the triggering user.
CREATE OR REPLACE FUNCTION public.is_member_of(convo_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM conversation_participants 
    WHERE conversation_id = convo_id 
    AND user_id = auth.uid()
  );
END;
$$;

-- 2. Update Conversation Participants policies (The source of recursion)
DROP POLICY IF EXISTS "participants_select" ON conversation_participants;
CREATE POLICY "participants_select" ON conversation_participants
  FOR SELECT USING (
    user_id = auth.uid() 
    OR 
    conversation_id IN (
      SELECT cp.conversation_id 
      FROM conversation_participants cp 
      WHERE cp.user_id = auth.uid()
    )
  );
-- Note: The above still has a subquery but is safer. However, using the function is even better:
DROP POLICY IF EXISTS "participants_select" ON conversation_participants;
CREATE POLICY "participants_select" ON conversation_participants
  FOR SELECT USING (
    user_id = auth.uid() 
    OR 
    public.is_member_of(conversation_id)
  );

-- 3. Update Conversations policies
DROP POLICY IF EXISTS "conversations_select" ON conversations;
CREATE POLICY "conversations_select" ON conversations
  FOR SELECT USING (
    created_by = auth.uid()
    OR
    public.is_member_of(id)
  );

-- 4. Update Messages policies
DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (
    public.is_member_of(conversation_id)
  );

DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    public.is_member_of(conversation_id)
  );

-- 5. Update Call Records policies
DROP POLICY IF EXISTS "calls_select" ON call_records;
CREATE POLICY "calls_select" ON call_records
  FOR SELECT USING (
    public.is_member_of(conversation_id)
  );

-- 6. Reload PostgREST to ensure schema cache is fresh
-- This is often needed after changing functions or types
NOTIFY pgrst, 'reload schema';

SELECT 'RLS Recursion fix and function created successfully! ✅' AS status;

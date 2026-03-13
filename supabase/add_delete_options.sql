-- Add column for "Delete for Me"
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_for_users UUID[] DEFAULT '{}';

-- Update RLS to allow "Delete for Me" (UPDATE on messages for any participant)
-- Note: We use UPDATE because "Delete for Me" simply adds the user ID to the array.
DROP POLICY IF EXISTS "messages_delete_for_me" ON messages;
CREATE POLICY "messages_delete_for_me" ON messages
  FOR UPDATE USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (TRUE);

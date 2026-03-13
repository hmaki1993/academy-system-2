-- ============================================================
-- ADVANCED CHAT FEATURES - Migration Script
-- Run this in your Supabase SQL editor
-- ============================================================

-- 1. Update Messages Table for Replies and Pinning
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- 2. Update Conversation Participants for Deletion/Clearing
ALTER TABLE conversation_participants 
ADD COLUMN IF NOT EXISTS cleared_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- 3. Update Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_messages_pinned ON messages(conversation_id) WHERE is_pinned = TRUE;

-- 4. Update RLS (Policies should already cover the new columns if they use SELECT *)
-- If specific column lists are used, they'll need updates. 
-- In our case, create_communications_tables.sql uses SELECT * in most policies.

SELECT 'Advanced Chat Features schema updated successfully! ✅' AS status;

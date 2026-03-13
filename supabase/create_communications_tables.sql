-- ============================================================
-- COMMUNICATION SUITE - Migration Script
-- Run this in your Supabase SQL editor
-- ============================================================

-- 1. Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'direct', -- 'direct' or 'group'
  name TEXT, -- only for group chats
  avatar_url TEXT, -- optional group avatar
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Conversation Participants Table
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- 3. Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT,
  type TEXT NOT NULL DEFAULT 'text', -- 'text', 'image', 'voice', 'video', 'call_event'
  media_url TEXT,
  media_duration INTEGER, -- seconds (for voice/video)
  media_size INTEGER,     -- bytes
  call_status TEXT,       -- for call_event type: 'missed', 'answered', 'rejected'
  call_duration INTEGER,  -- seconds for ended calls
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- 4. Call Records Table
CREATE TABLE IF NOT EXISTS call_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  caller_id UUID REFERENCES profiles(id),
  call_type TEXT NOT NULL DEFAULT 'audio', -- 'audio' or 'video'
  status TEXT DEFAULT 'ringing',           -- 'ringing', 'active', 'ended', 'missed', 'rejected'
  agora_channel_id TEXT UNIQUE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER
);

-- ============================================================
-- INDEXES (for performance)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_call_records_conversation ON call_records(conversation_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_records ENABLE ROW LEVEL SECURITY;

-- Conversations: Users can see conversations they are part of
CREATE POLICY "conversations_select" ON conversations
  FOR SELECT USING (
    id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "conversations_insert" ON conversations
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "conversations_update" ON conversations
  FOR UPDATE USING (created_by = auth.uid());

-- Participants: Users can see all participants of their conversations
CREATE POLICY "participants_select" ON conversation_participants
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "participants_insert" ON conversation_participants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Messages: Users can read messages in their conversations
CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "messages_update" ON messages
  FOR UPDATE USING (sender_id = auth.uid());

-- Call Records
CREATE POLICY "calls_select" ON call_records
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "calls_insert" ON call_records
  FOR INSERT WITH CHECK (caller_id = auth.uid());

CREATE POLICY "calls_update" ON call_records
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ============================================================
-- REALTIME (enable for live updates)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE call_records;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- ============================================================
-- STORAGE BUCKET for chat media
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  true,
  10485760, -- 10 MB max per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/webm', 'audio/mp4', 'audio/ogg', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for chat-media bucket
CREATE POLICY "chat_media_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-media');

CREATE POLICY "chat_media_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'chat-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "chat_media_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);

SELECT 'Communication Suite tables created successfully! ✅' AS status;

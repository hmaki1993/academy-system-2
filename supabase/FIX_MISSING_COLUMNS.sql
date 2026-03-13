-- ============================================================
-- COMPLETE FIX: Missing columns + RLS recursion + 403 errors
-- Run THIS SINGLE FILE in Supabase SQL Editor
-- ============================================================

-- ─── STEP 1: ADD ALL MISSING COLUMNS ─────────────────────────────────────────

ALTER TABLE conversation_participants
  ADD COLUMN IF NOT EXISTS is_hidden   BOOLEAN    DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cleared_at  TIMESTAMPTZ;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS reply_to_id        UUID REFERENCES messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_pinned          BOOLEAN    DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_for_users  UUID[]     DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS delivered_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS read_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS call_type          TEXT,
  ADD COLUMN IF NOT EXISTS caller_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS call_duration      INTEGER;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS push_subscription JSONB;

-- ─── STEP 2: INDEXES ──────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_messages_reply_to  ON messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_messages_pinned    ON messages(conversation_id) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_messages_delivered ON messages(conversation_id, delivered_at);
CREATE INDEX IF NOT EXISTS idx_messages_read      ON messages(conversation_id, read_at);

-- ─── STEP 3: SECURITY DEFINER FUNCTION (fixes RLS recursion = 500 errors) ────

CREATE OR REPLACE FUNCTION public.is_conversation_member(convo_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = convo_id
    AND user_id = auth.uid()
  );
END;
$$;

-- ─── STEP 4: NUCLEAR RLS RESET (drop all + recreate cleanly) ─────────────────

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN ('conversations','conversation_participants','messages','call_records','profiles')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- CONVERSATIONS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversations_insert" ON conversations
  FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "conversations_select" ON conversations
  FOR SELECT USING (
    created_by = auth.uid()
    OR public.is_conversation_member(id)
  );
CREATE POLICY "conversations_update" ON conversations
  FOR UPDATE USING (public.is_conversation_member(id));

-- CONVERSATION PARTICIPANTS
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants_insert" ON conversation_participants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "participants_select" ON conversation_participants
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_conversation_member(conversation_id)
  );
CREATE POLICY "participants_update" ON conversation_participants
  FOR UPDATE USING (user_id = auth.uid());

-- MESSAGES
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (
    sender_id = auth.uid()
    OR public.is_conversation_member(conversation_id)
  );
CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND public.is_conversation_member(conversation_id)
  );
CREATE POLICY "messages_update" ON messages
  FOR UPDATE USING (
    sender_id = auth.uid()
    OR public.is_conversation_member(conversation_id)
  );
CREATE POLICY "messages_delete" ON messages
  FOR DELETE USING (sender_id = auth.uid());

-- CALL RECORDS
ALTER TABLE call_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calls_select" ON call_records
  FOR SELECT USING (public.is_conversation_member(conversation_id));
CREATE POLICY "calls_insert" ON call_records
  FOR INSERT WITH CHECK (caller_id = auth.uid());
CREATE POLICY "calls_update" ON call_records
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ─── STEP 5: REALTIME ────────────────────────────────────────────────────────

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE messages;             EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE call_records;         EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE conversations;        EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'COMPLETE FIX applied — 500 errors, 403 errors, and missing columns all fixed! ✅' AS status;

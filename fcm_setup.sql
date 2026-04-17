-- 🔥 FCM: جدول جديد لحفظ Firebase Cloud Messaging Tokens
-- شغّل ده في Supabase SQL Editor مرة واحدة بس

CREATE TABLE IF NOT EXISTS user_fcm_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL,
  device_info TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, fcm_token)
);

-- تفعيل الحماية
ALTER TABLE user_fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: كل يوزر يشوف tokens بتاعته بس
CREATE POLICY IF NOT EXISTS "Users manage own FCM tokens"
  ON user_fcm_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index للأداء
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON user_fcm_tokens(user_id);

-- تحديث تلقائي للـ updated_at
CREATE OR REPLACE FUNCTION update_fcm_token_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_fcm_token_timestamp ON user_fcm_tokens;
CREATE TRIGGER set_fcm_token_timestamp
  BEFORE UPDATE ON user_fcm_tokens
  FOR EACH ROW EXECUTE FUNCTION update_fcm_token_timestamp();

-- تأكيد
SELECT 'user_fcm_tokens table created successfully! 🔥' as status;

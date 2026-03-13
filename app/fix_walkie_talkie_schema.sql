-- 🚨 FIX: Walkie-Talkie Schema Issues
-- This script ensures the voice_broadcasts table has all required columns and proper permissions.

-- 1. Create table if missing
CREATE TABLE IF NOT EXISTS public.voice_broadcasts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    audio_url TEXT NOT NULL,
    target_users UUID[] DEFAULT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add missing columns to existing table
ALTER TABLE public.voice_broadcasts 
ADD COLUMN IF NOT EXISTS target_users UUID[] DEFAULT NULL;

ALTER TABLE public.voice_broadcasts 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 3. Enable RLS
ALTER TABLE public.voice_broadcasts ENABLE ROW LEVEL SECURITY;

-- 4. Create Policy (Safe Drop/Create)
DROP POLICY IF EXISTS "Auth access" ON public.voice_broadcasts;
CREATE POLICY "Auth access" ON public.voice_broadcasts 
FOR ALL TO authenticated 
USING (true) 
WITH CHECK (true);

-- 5. Enable Realtime (Ignore if already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'voice_broadcasts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_broadcasts;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignore if publication doesn't exist or other errors
END $$;

-- 6. Reload PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';

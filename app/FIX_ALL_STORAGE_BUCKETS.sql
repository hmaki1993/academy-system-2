-- ============================================================
-- FIX ALL STORAGE BUCKETS & MISSING TABLES
-- ============================================================
-- Run this in Supabase SQL Editor to fix all 400 storage errors
-- and missing table errors in the web app.
-- ============================================================

-- ┌─────────────────────────────────────────────────────────┐
-- │  PART 1: CREATE MISSING STORAGE BUCKETS                 │
-- └─────────────────────────────────────────────────────────┘

-- Bucket: coaches (used by AddCoachForm.tsx for coach profile images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'coaches',
    'coaches',
    TRUE,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = TRUE,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Bucket: logos (used by SettingsContainer.tsx for academy logo & login background)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'logos',
    'logos',
    TRUE,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = TRUE,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

-- Bucket: chat-media (used by Communications.tsx for chat images, videos, voice notes)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'chat-media',
    'chat-media',
    TRUE,
    52428800, -- 50MB limit (for videos)
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif',
          'video/mp4', 'video/webm',
          'audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/ogg']
)
ON CONFLICT (id) DO UPDATE SET
    public = TRUE,
    file_size_limit = 52428800;

-- Bucket: walkie-talkie (used by WalkieTalkie.tsx for voice broadcasts)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'walkie-talkie',
    'walkie-talkie',
    TRUE,
    10485760, -- 10MB limit
    ARRAY['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/ogg']
)
ON CONFLICT (id) DO UPDATE SET
    public = TRUE,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/ogg'];

-- ┌─────────────────────────────────────────────────────────┐
-- │  PART 2: STORAGE RLS POLICIES                           │
-- └─────────────────────────────────────────────────────────┘

-- Allow authenticated users to upload to all buckets
DO $$
DECLARE
    bucket_names TEXT[] := ARRAY['coaches', 'logos', 'chat-media', 'walkie-talkie'];
    b TEXT;
BEGIN
    FOREACH b IN ARRAY bucket_names LOOP
        -- Upload policy
        EXECUTE format(
            'DROP POLICY IF EXISTS "Authenticated upload %s" ON storage.objects',
            b
        );
        EXECUTE format(
            'CREATE POLICY "Authenticated upload %s" ON storage.objects
            FOR INSERT TO authenticated
            WITH CHECK (bucket_id = %L)',
            b, b
        );

        -- Read/Select policy (public reading)
        EXECUTE format(
            'DROP POLICY IF EXISTS "Public read %s" ON storage.objects',
            b
        );
        EXECUTE format(
            'CREATE POLICY "Public read %s" ON storage.objects
            FOR SELECT USING (bucket_id = %L)',
            b, b
        );

        -- Update policy
        EXECUTE format(
            'DROP POLICY IF EXISTS "Authenticated update %s" ON storage.objects',
            b
        );
        EXECUTE format(
            'CREATE POLICY "Authenticated update %s" ON storage.objects
            FOR UPDATE TO authenticated
            USING (bucket_id = %L)',
            b, b
        );

        -- Delete policy
        EXECUTE format(
            'DROP POLICY IF EXISTS "Authenticated delete %s" ON storage.objects',
            b
        );
        EXECUTE format(
            'CREATE POLICY "Authenticated delete %s" ON storage.objects
            FOR DELETE TO authenticated
            USING (bucket_id = %L)',
            b, b
        );
    END LOOP;
END $$;

-- ┌─────────────────────────────────────────────────────────┐
-- │  PART 3: CREATE MISSING DB TABLE: voice_broadcasts      │
-- └─────────────────────────────────────────────────────────┘

-- Used by WalkieTalkie.tsx for walkie-talkie feature
CREATE TABLE IF NOT EXISTS public.voice_broadcasts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    audio_url TEXT NOT NULL,
    target_users UUID[], -- NULL = broadcast to everyone
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 minute'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.voice_broadcasts ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Auth access" ON public.voice_broadcasts;

-- Allow all authenticated users to read and insert broadcasts
CREATE POLICY "Auth access" ON public.voice_broadcasts
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Enable Realtime for voice_broadcasts
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_broadcasts;
EXCEPTION WHEN OTHERS THEN
    NULL; -- Already added, ignore
END $$;

-- ┌─────────────────────────────────────────────────────────┐
-- │  PART 4: AUTO-CLEANUP EXPIRED BROADCASTS               │
-- └─────────────────────────────────────────────────────────┘

-- Optional: cleanup function for old broadcasts
CREATE OR REPLACE FUNCTION public.cleanup_expired_broadcasts()
RETURNS void AS $$
BEGIN
    DELETE FROM public.voice_broadcasts WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ┌─────────────────────────────────────────────────────────┐
-- │  DONE! Reload PostgREST schema cache                    │
-- └─────────────────────────────────────────────────────────┘
NOTIFY pgrst, 'reload schema';

-- ✅ Summary of what was fixed:
-- 1. Created storage bucket: 'coaches'    → Coach profile image uploads
-- 2. Created storage bucket: 'logos'      → Academy logo & login backgrounds  
-- 3. Created storage bucket: 'chat-media' → Chat images, videos, voice notes
-- 4. Created storage bucket: 'walkie-talkie' → Walkie-talkie audio broadcasts
-- 5. Created table: voice_broadcasts      → Walkie-talkie feature data
-- 6. Added RLS policies for all buckets   → Authenticated upload/read/delete
-- 7. Enabled Realtime for voice_broadcasts

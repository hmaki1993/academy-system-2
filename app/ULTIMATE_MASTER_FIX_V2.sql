-- ============================================================
-- ULTIMATE MASTER FIX (V2) - HEALY ACADEMY SYSTEM
-- ============================================================
-- Resolve all critical Database & Storage issues found in Deep Check.
-- 1. Create missing tables (skills, attendance, chat)
-- 2. Add missing columns (is_hidden)
-- 3. Ensure global settings exist
-- 4. Create ALL necessary storage buckets
-- ============================================================

-- [1] Extensions & Enums
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- [2] Core Tables (Ensuring existence and basic schema)
-- Profiles (Base table)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE,
    full_name TEXT,
    role TEXT DEFAULT 'coach',
    avatar_url TEXT,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    is_in_chat BOOLEAN DEFAULT FALSE,
    push_subscription JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gym Settings (The cause of 406 errors)
CREATE TABLE IF NOT EXISTS public.gym_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    academy_name TEXT DEFAULT 'Epic Academy',
    logo_url TEXT,
    primary_color TEXT DEFAULT '#ef4444',
    secondary_color TEXT DEFAULT '#1f2937',
    accent_color TEXT DEFAULT '#ef4444',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure a default row exists in gym_settings
INSERT INTO public.gym_settings (academy_name) 
SELECT 'Epic Academy'
WHERE NOT EXISTS (SELECT 1 FROM public.gym_settings)
ON CONFLICT (id) DO NOTHING;

-- [3] MISSING TABLES - Identified in Deep Check
-- 3.1 Defined Skills
CREATE TABLE IF NOT EXISTS public.defined_skills (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    max_score INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.2 Student Attendance (The one used in StudentAttendance.tsx)
CREATE TABLE IF NOT EXISTS public.student_attendance (
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'present',
    check_in_time TIMESTAMPTZ DEFAULT NOW(),
    check_out_time TIMESTAMPTZ,
    PRIMARY KEY (student_id, date)
);

-- 3.3 Chat Tables (Conversations, Participants, Messages)
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT DEFAULT 'dm', -- 'dm', 'group'
    name TEXT,
    avatar_url TEXT,
    created_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    is_hidden BOOLEAN DEFAULT FALSE,
    cleared_at TIMESTAMPTZ,
    PRIMARY KEY (conversation_id, user_id)
);

-- CRITICAL FIX: Add is_hidden if table already existed but lacked it
ALTER TABLE public.conversation_participants ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;
ALTER TABLE public.conversation_participants ADD COLUMN IF NOT EXISTS cleared_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id),
    content TEXT,
    type TEXT DEFAULT 'text',
    media_url TEXT,
    media_duration FLOAT,
    call_status TEXT,
    call_duration INTEGER,
    call_type TEXT,
    caller_id UUID REFERENCES public.profiles(id),
    read_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.4 Walkie-Talkie
CREATE TABLE IF NOT EXISTS public.voice_broadcasts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    audio_url TEXT NOT NULL,
    target_users UUID[],
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 minute'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- [4] Storage Buckets Creation
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('coaches', 'coaches', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    ('logos', 'logos', TRUE, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']),
    ('chat-media', 'chat-media', TRUE, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/ogg']),
    ('walkie-talkie', 'walkie-talkie', TRUE, 10485760, ARRAY['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/ogg'])
ON CONFLICT (id) DO UPDATE SET public = TRUE;

-- [5] Security (RLS) - Universal Auth Access for Public tables
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Auth access" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Auth access" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

-- Storage Policies
DO $$
DECLARE
    bucket_names TEXT[] := ARRAY['coaches', 'logos', 'chat-media', 'walkie-talkie'];
    b TEXT;
BEGIN
    FOREACH b IN ARRAY bucket_names LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public read %s" ON storage.objects', b);
        EXECUTE format('CREATE POLICY "Public read %s" ON storage.objects FOR SELECT USING (bucket_id = %L)', b, b);
        EXECUTE format('DROP POLICY IF EXISTS "Auth upload %s" ON storage.objects', b);
        EXECUTE format('CREATE POLICY "Auth upload %s" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %L)', b, b);
        EXECUTE format('DROP POLICY IF EXISTS "Auth delete %s" ON storage.objects', b);
        EXECUTE format('CREATE POLICY "Auth delete %s" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = %L)', b, b);
    END LOOP;
END $$;

-- [6] Realtime Configuration
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        EXCEPTION WHEN OTHERS THEN NULL; END;
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

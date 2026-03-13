-- ============================================================
-- 🏆 EPIC ACADEMY GOLDEN SCHEMA (ULTIMATE SETUP)
-- ============================================================
-- Use this file to set up a brand new Epic Academy project from scratch.
-- Includes: Core, Finance, PT, Attendance, Chat, Storage, and RPC Fixes.
-- Combines all V1 to V5 fixes into one single deployable script.
-- ============================================================

-- [1] Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- [2] Profiles & Core
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

CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    language TEXT DEFAULT 'en',
    font_scale DECIMAL(3,2) DEFAULT 1.0,
    text_color_base TEXT,
    text_color_muted TEXT,
    border_radius TEXT,
    glass_opacity DECIMAL(3,2),
    surface_color TEXT,
    hover_color TEXT,
    input_bg_color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gym Settings
CREATE TABLE IF NOT EXISTS public.gym_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    academy_name TEXT DEFAULT 'Epic Academy',
    logo_url TEXT,
    gym_address TEXT,
    gym_phone TEXT,
    primary_color TEXT DEFAULT '#ef4444',
    secondary_color TEXT DEFAULT '#1f2937',
    accent_color TEXT DEFAULT '#ef4444',
    surface_color TEXT,
    text_color_base TEXT,
    text_color_muted TEXT,
    border_radius TEXT,
    glass_opacity DECIMAL(3,2),
    hover_color TEXT,
    input_bg_color TEXT,
    brand_label_color TEXT,
    premium_badge_color TEXT,
    menu_icon_color TEXT,
    font_scale DECIMAL(3,2) DEFAULT 1.0,
    clock_position TEXT DEFAULT 'dashboard',
    clock_integration BOOLEAN DEFAULT TRUE,
    weather_integration BOOLEAN DEFAULT TRUE,
    language TEXT DEFAULT 'en',
    search_icon_color TEXT,
    search_bg_color TEXT,
    search_border_color TEXT,
    search_text_color TEXT,
    hover_border_color TEXT,
    login_bg_url TEXT,
    login_logo_url TEXT,
    login_show_logo BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure base row exists
INSERT INTO public.gym_settings (academy_name) 
SELECT 'Epic Academy'
WHERE NOT EXISTS (SELECT 1 FROM public.gym_settings)
ON CONFLICT (id) DO NOTHING;

-- [3] Academy Management Tables
CREATE TABLE IF NOT EXISTS public.coaches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    specialty TEXT DEFAULT 'General Coach',
    bio TEXT,
    role TEXT DEFAULT 'coach',
    pt_rate DECIMAL(10, 2) DEFAULT 0,
    salary DECIMAL(10, 2) DEFAULT 0,
    commission_rate DECIMAL(5, 2) DEFAULT 0,
    avatar_url TEXT,
    image_pos_x FLOAT DEFAULT 0.5,
    image_pos_y FLOAT DEFAULT 0.2,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT coaches_profile_id_key UNIQUE (profile_id)
);

CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    duration_months INTEGER DEFAULT 1,
    sessions_limit INTEGER,
    sessions_per_week INTEGER DEFAULT 3,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.training_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
    schedule JSONB DEFAULT '[]'::jsonb, 
    schedule_key TEXT, 
    capacity INTEGER DEFAULT 20,
    level TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    father_name TEXT,
    mother_name TEXT,
    email TEXT,
    address TEXT,
    birth_date DATE,
    gender TEXT DEFAULT 'male',
    training_type TEXT,
    age INTEGER,
    contact_number TEXT,
    parent_contact TEXT,
    subscription_expiry TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    status TEXT DEFAULT 'active',
    coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
    subscription_plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
    training_group_id UUID REFERENCES public.training_groups(id) ON DELETE SET NULL,
    sessions_remaining INTEGER,
    notes TEXT,
    training_days TEXT[] DEFAULT '{}',
    training_schedule JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- [4] Finance Module
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'cash',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT,
  expense_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id),
  amount DECIMAL(10,2) NOT NULL,
  refund_date DATE DEFAULT CURRENT_DATE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.finance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    row_id UUID NOT NULL,
    row_data JSONB NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('DELETE', 'UPDATE')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- [5] PT Module
CREATE TABLE IF NOT EXISTS public.pt_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id),
  coach_id UUID REFERENCES public.coaches(id),
  student_name TEXT,
  sessions_total INTEGER NOT NULL DEFAULT 10,
  sessions_used INTEGER DEFAULT 0,
  sessions_remaining INTEGER DEFAULT 10,
  price_per_session DECIMAL(10,2) DEFAULT 0,
  total_price DECIMAL(10,2) DEFAULT 0,
  coach_share DECIMAL(10,2) DEFAULT 0,
  start_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pt_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID REFERENCES public.coaches(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.pt_subscriptions(id) ON DELETE CASCADE,
    student_name TEXT,
    sessions_count INTEGER DEFAULT 1,
    coach_share DECIMAL(10,2) DEFAULT 0,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- [6] Attendance & Evaluations
CREATE TABLE IF NOT EXISTS public.student_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'present',
    check_in_time TIMESTAMPTZ DEFAULT NOW(),
    check_out_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coach_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID REFERENCES public.coaches(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    check_in_time TIMESTAMPTZ DEFAULT NOW(),
    check_out_time TIMESTAMPTZ,
    status TEXT DEFAULT 'present',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.skill_assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    skills JSONB DEFAULT '[]'::jsonb,
    total_score DECIMAL(10,2),
    status TEXT DEFAULT 'present',
    evaluation_status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- [7] Chat & Communication
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT DEFAULT 'dm',
    name TEXT,
    avatar_url TEXT,
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

-- [8] Storage Buckets
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES 
        ('coaches', 'coaches', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
        ('logos', 'logos', TRUE, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']),
        ('chat-media', 'chat-media', TRUE, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/ogg']),
        ('walkie-talkie', 'walkie-talkie', TRUE, 10485760, ARRAY['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/ogg'])
    ON CONFLICT (id) DO UPDATE SET public = TRUE;
END $$;

-- Storage Policies
DO $$
DECLARE
    bucket_list TEXT[] := ARRAY['coaches', 'logos', 'chat-media', 'walkie-talkie'];
    b TEXT;
BEGIN
    FOREACH b IN ARRAY bucket_list LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public read %s" ON storage.objects', b);
        EXECUTE format('CREATE POLICY "Public read %s" ON storage.objects FOR SELECT USING (bucket_id = %L)', b, b);
        EXECUTE format('DROP POLICY IF EXISTS "Auth upload %s" ON storage.objects', b);
        EXECUTE format('CREATE POLICY "Auth upload %s" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %L)', b, b);
        EXECUTE format('DROP POLICY IF EXISTS "Auth delete %s" ON storage.objects', b);
        EXECUTE format('CREATE POLICY "Auth delete %s" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = %L)', b, b);
    END LOOP;
END $$;

-- [9] RPC Functions 
DROP FUNCTION IF EXISTS public.delete_user_by_id(uuid);
CREATE OR REPLACE FUNCTION public.delete_user_by_id(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Create New User Function (Includes Identities & Tokens Fix for GoTrue)
CREATE OR REPLACE FUNCTION public.create_new_user(
    email TEXT,
    password TEXT,
    user_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_user_id UUID := gen_random_uuid();
    full_metadata JSONB := user_metadata || '{"email_verified": true}'::jsonb;
BEGIN
    -- 1. Insert the auth user (Ensuring tokens are empty strings, not NULL)
    INSERT INTO auth.users (
        id, 
        instance_id,
        email, 
        encrypted_password, 
        raw_user_meta_data, 
        raw_app_meta_data,
        email_confirmed_at, 
        last_sign_in_at,
        role, 
        aud, 
        created_at, 
        updated_at,
        is_super_admin,
        is_sso_user,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
    )
    VALUES (
        new_user_id,
        '00000000-0000-0000-0000-000000000000',
        email, 
        crypt(password, gen_salt('bf')), 
        full_metadata, 
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        NOW(), 
        NOW(),
        'authenticated', 
        'authenticated', 
        NOW(), 
        NOW(),
        FALSE,
        FALSE,
        '',
        '',
        '',
        ''
    );

    -- 2. Create the identity (REQUIRED for Supabase GoTrue to avoid 500 on login)
    INSERT INTO auth.identities (
        user_id,
        provider_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    )
    VALUES (
        new_user_id,
        new_user_id::text,
        jsonb_build_object('sub', new_user_id, 'email', email, 'email_verified', true, 'phone_verified', false),
        'email',
        NOW(),
        NOW(),
        NOW()
    );

    RETURN new_user_id;
END;
$$;

-- Trigger Function for creating Profile automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'coach')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = COALESCE(EXCLUDED.role, profiles.role);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Map trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- [10] Security (RLS) & Realtime Optimization
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Auth access" ON public.%I', t);
        
        -- Prevent RLS Recursion loop for Participants
        IF t = 'conversation_participants' THEN
            EXECUTE format('CREATE POLICY "Auth access" ON public.%I FOR ALL TO authenticated USING (user_id = auth.uid())', t);
        ELSE
            EXECUTE format('CREATE POLICY "Auth access" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
        END IF;
        
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        EXCEPTION WHEN OTHERS THEN NULL; END;
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

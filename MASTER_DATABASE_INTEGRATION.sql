-- ============================================================
-- MASTER DATABASE INTEGRATION - HEALY ACADEMY SYSTEM
-- ============================================================
-- This script synchronizes the schema with the exact requirements
-- of the UI components and data hooks.
-- ============================================================

-- [1] Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- [2] Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'head_coach', 'coach', 'reception', 'cleaner');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [3] Profiles
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

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_in_chat BOOLEAN DEFAULT FALSE;

-- [4] Coaches
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

-- Sync profiles to coaches
INSERT INTO public.coaches (profile_id, full_name, email, role)
SELECT id, full_name, email, role
FROM public.profiles
WHERE role IN ('coach', 'head_coach', 'admin')
ON CONFLICT (profile_id) DO NOTHING;

-- [5] Subscription Plans
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

-- [6] Training Groups
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

-- [7] Students (Aligning names with AddStudentForm.tsx)
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FORCE COLUMNS EXIST (In case students table was created without them)
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS father_name TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS mother_name TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'male';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS training_type TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS contact_number TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_contact TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMPTZ;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS coach_id UUID;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS subscription_plan_id UUID;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS training_group_id UUID;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS sessions_remaining INTEGER;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS training_days TEXT[] DEFAULT '{}';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS training_schedule JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS current_training_level INTEGER DEFAULT 1;
ALTER TABLE public.students ADD CONSTRAINT students_profile_id_key UNIQUE (profile_id);

-- FORCE FK RELATIONSHIPS
ALTER TABLE public.students 
DROP CONSTRAINT IF EXISTS students_subscription_plan_id_fkey,
ADD CONSTRAINT students_subscription_plan_id_fkey 
FOREIGN KEY (subscription_plan_id) REFERENCES public.subscription_plans(id) ON DELETE SET NULL;

ALTER TABLE public.students 
DROP CONSTRAINT IF EXISTS students_training_group_id_fkey,
ADD CONSTRAINT students_training_group_id_fkey 
FOREIGN KEY (training_group_id) REFERENCES public.training_groups(id) ON DELETE SET NULL;

ALTER TABLE public.students 
DROP CONSTRAINT IF EXISTS students_coach_id_fkey,
ADD CONSTRAINT students_coach_id_fkey 
FOREIGN KEY (coach_id) REFERENCES public.coaches(id) ON DELETE SET NULL;

-- [8] Attendance & Schedule Tables
CREATE TABLE IF NOT EXISTS public.attendance (
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
    pt_sessions_count INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.coach_attendance ADD COLUMN IF NOT EXISTS pt_sessions_count INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.student_training_schedule (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.training_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
    day_of_week TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    title TEXT DEFAULT 'Group Training',
    capacity INTEGER DEFAULT 20,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- [9] Finance Tables
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE DEFAULT CURRENT_DATE,
    payment_method TEXT DEFAULT 'cash',
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category TEXT,
    expense_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.refunds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    refund_date DATE DEFAULT CURRENT_DATE,
    reason TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.finance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    row_id UUID NOT NULL,
    row_data JSONB NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('DELETE', 'UPDATE')),
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- [10] PT (Personal Training)
CREATE TABLE IF NOT EXISTS public.pt_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
    student_name TEXT,
    student_email TEXT,
    sessions_total INTEGER NOT NULL DEFAULT 10,
    sessions_remaining INTEGER DEFAULT 10,
    total_price DECIMAL(10,2) DEFAULT 0,
    coach_share DECIMAL(10,2) DEFAULT 0,
    start_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE,
    status TEXT DEFAULT 'active',
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pt_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID REFERENCES public.coaches(id) ON DELETE CASCADE,
    student_name TEXT,
    sessions_count INTEGER DEFAULT 1,
    coach_share DECIMAL(10,2) DEFAULT 0,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- [11] Communication & Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    related_student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    related_coach_id UUID, -- Relaxed to prevent strict profile/coach FK conflicts
    target_role TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Force relax existing constraints if they exist
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_related_coach_id_fkey;

-- [12] MEGA THEME FIX (Settings Tables)
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
    -- Login Design (Desktop)
    login_bg_url TEXT,
    login_logo_url TEXT,
    login_card_opacity DECIMAL(3,2),
    login_card_color TEXT,
    login_logo_scale DECIMAL(3,2),
    login_logo_x_offset INTEGER,
    login_logo_y_offset INTEGER,
    login_bg_blur INTEGER,
    login_bg_brightness DECIMAL(3,2),
    login_bg_zoom DECIMAL(3,2),
    login_bg_x_offset INTEGER,
    login_bg_y_offset INTEGER,
    login_card_x_offset INTEGER,
    login_card_y_offset INTEGER,
    login_card_border_color TEXT,
    login_card_scale DECIMAL(3,2),
    login_show_logo BOOLEAN DEFAULT TRUE,
    login_text_color TEXT,
    login_accent_color TEXT,
    login_logo_opacity DECIMAL(3,2),
    login_bg_fit TEXT DEFAULT 'cover',
    login_bg_opacity DECIMAL(3,2),
    login_card_width INTEGER DEFAULT 440,
    login_card_height INTEGER DEFAULT 600,
    login_heading_size INTEGER,
    login_input_size INTEGER,
    login_label_size INTEGER,
    login_card_border_width INTEGER,
    login_card_glow_size INTEGER,
    login_card_glow_opacity INTEGER,
    -- Login Design (Mobile)
    login_mobile_bg_url TEXT,
    login_mobile_logo_url TEXT,
    login_mobile_card_opacity DECIMAL(3,2),
    login_mobile_card_color TEXT,
    login_mobile_logo_scale DECIMAL(3,2),
    login_mobile_logo_x_offset INTEGER,
    login_mobile_logo_y_offset INTEGER,
    login_mobile_bg_blur INTEGER,
    login_mobile_bg_brightness DECIMAL(3,2),
    login_mobile_bg_zoom DECIMAL(3,2),
    login_mobile_bg_x_offset INTEGER,
    login_mobile_bg_y_offset INTEGER,
    login_mobile_card_x_offset INTEGER,
    login_mobile_card_y_offset INTEGER,
    login_mobile_card_border_color TEXT,
    login_mobile_card_scale DECIMAL(3,2),
    login_mobile_show_logo BOOLEAN DEFAULT TRUE,
    login_mobile_text_color TEXT,
    login_mobile_accent_color TEXT,
    login_mobile_logo_opacity DECIMAL(3,2),
    login_mobile_bg_fit TEXT DEFAULT 'cover',
    login_mobile_bg_opacity DECIMAL(3,2),
    login_mobile_card_width INTEGER DEFAULT 340,
    login_mobile_card_height INTEGER DEFAULT 500,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure default row exists
INSERT INTO public.gym_settings (academy_name) 
VALUES ('Epic Academy')
ON CONFLICT DO NOTHING;

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
    brand_label_color TEXT,
    premium_badge_color TEXT,
    menu_icon_color TEXT,
    search_icon_color TEXT,
    search_bg_color TEXT,
    search_border_color TEXT,
    search_text_color TEXT,
    hover_border_color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- [13] Fame Academy Features: Videos & Assignments
CREATE TABLE IF NOT EXISTS public.training_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration TEXT,
    plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
    category TEXT DEFAULT 'general',
    level_number INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.training_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
    target_jumps INTEGER,
    target_duration_minutes INTEGER,
    instructions TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- [14] RLS for Fame Academy Features
ALTER TABLE public.training_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;

-- Videos: Everyone can see, only coaches/admins can manage
CREATE POLICY "Everyone can view training videos" 
ON public.training_videos FOR SELECT 
TO authenticated 
USING (true);

  )
);

-- Advanced Level RLS: Students only see videos for their current assigned level
DROP POLICY IF EXISTS "Students can only see their current level videos" ON public.training_videos;
CREATE POLICY "Students can only see their current level videos" 
ON public.training_videos FOR SELECT 
TO authenticated 
USING (
  level_number <= (
    SELECT current_training_level FROM public.students 
    WHERE profile_id = auth.uid()
    LIMIT 1
  ) OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'coach', 'head_coach')
  )
);

-- Assignments: Coaches can manage, students can see their own
CREATE POLICY "Students can view their assignments" 
ON public.training_assignments FOR SELECT 
TO authenticated 
USING (
    student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
);

CREATE POLICY "Coaches can manage assignments" 
ON public.training_assignments FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'coach', 'head_coach')
  )
);

-- Update pt_sessions to include Zoom link
ALTER TABLE public.pt_sessions ADD COLUMN IF NOT EXISTS zoom_link TEXT;

-- [15] Supabase Storage Policies (For 'videos' bucket)
-- NOTE: Make sure the bucket 'videos' exists in Supabase Storage first.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'videos');

CREATE POLICY "Coaches can upload" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'videos' AND 
  (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'coach', 'head_coach')
  ))
);

CREATE POLICY "Coaches can delete" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'videos' AND 
  (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'coach', 'head_coach')
  ))
);

-- [14] RLS Policies (Safe Defaults)
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
        EXECUTE format('DROP POLICY IF EXISTS "Public access" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Auth access" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Auth access" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

-- [14] Realtime Configuration
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
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;
END $$;

-- [15] Final Check & Reload PostgREST
NOTIFY pgrst, 'reload';

-- ========================================================
-- FINAL DATABASE FIX - RESTORING MISSING TABLES
-- ========================================================
-- This script fixes the 404/400 errors by restoring tables 
-- that the frontend expects but were missing from the schema.
-- ========================================================

-- [0] Fix 'profiles' table columns & Enums
DO $$ BEGIN
    ALTER TYPE user_role ADD VALUE 'receptionist';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_subscription JSONB;

-- [0.1] Handle role column type change (handle dependencies)
DROP POLICY IF EXISTS "Admins and Coaches can view all jump sessions" ON public.jump_sessions;
DROP POLICY IF EXISTS "Allow admins to manage finance history" ON public.finance_history;
DROP POLICY IF EXISTS "Allow admin manage coaches" ON public.coaches;
DROP POLICY IF EXISTS "Allow admin manage groups" ON public.training_groups;

ALTER TABLE public.profiles ALTER COLUMN role TYPE TEXT;

-- Recreate policies after type change
CREATE POLICY "Admins and Coaches can view all jump sessions" ON public.jump_sessions FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'coach')));
CREATE POLICY "Allow admins to manage finance history" ON public.finance_history FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- [0.2] Add missing Theme columns to settings tables
ALTER TABLE public.gym_settings 
ADD COLUMN IF NOT EXISTS font_scale DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS text_color_base TEXT,
ADD COLUMN IF NOT EXISTS text_color_muted TEXT,
ADD COLUMN IF NOT EXISTS border_radius TEXT,
ADD COLUMN IF NOT EXISTS glass_opacity DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS surface_color TEXT,
ADD COLUMN IF NOT EXISTS hover_color TEXT,
ADD COLUMN IF NOT EXISTS input_bg_color TEXT,
ADD COLUMN IF NOT EXISTS brand_label_color TEXT,
ADD COLUMN IF NOT EXISTS premium_badge_color TEXT,
ADD COLUMN IF NOT EXISTS menu_icon_color TEXT,
ADD COLUMN IF NOT EXISTS clock_position TEXT DEFAULT 'dashboard',
ADD COLUMN IF NOT EXISTS clock_integration BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS weather_integration BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS academy_name TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS gym_address TEXT,
ADD COLUMN IF NOT EXISTS gym_phone TEXT,
ADD COLUMN IF NOT EXISTS search_icon_color TEXT,
ADD COLUMN IF NOT EXISTS search_bg_color TEXT,
ADD COLUMN IF NOT EXISTS search_border_color TEXT,
ADD COLUMN IF NOT EXISTS search_text_color TEXT,
ADD COLUMN IF NOT EXISTS hover_border_color TEXT,
-- Login Design (Desktop)
ADD COLUMN IF NOT EXISTS login_bg_url TEXT,
ADD COLUMN IF NOT EXISTS login_logo_url TEXT,
ADD COLUMN IF NOT EXISTS login_card_opacity DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS login_card_color TEXT,
ADD COLUMN IF NOT EXISTS login_logo_scale DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS login_logo_x_offset INTEGER,
ADD COLUMN IF NOT EXISTS login_logo_y_offset INTEGER,
ADD COLUMN IF NOT EXISTS login_bg_blur INTEGER,
ADD COLUMN IF NOT EXISTS login_bg_brightness DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS login_bg_zoom DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS login_bg_x_offset INTEGER,
ADD COLUMN IF NOT EXISTS login_bg_y_offset INTEGER,
ADD COLUMN IF NOT EXISTS login_card_x_offset INTEGER,
ADD COLUMN IF NOT EXISTS login_card_y_offset INTEGER,
ADD COLUMN IF NOT EXISTS login_card_border_color TEXT,
ADD COLUMN IF NOT EXISTS login_card_scale DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS login_show_logo BOOLEAN,
ADD COLUMN IF NOT EXISTS login_text_color TEXT,
ADD COLUMN IF NOT EXISTS login_accent_color TEXT,
ADD COLUMN IF NOT EXISTS login_logo_opacity DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS login_bg_fit TEXT,
ADD COLUMN IF NOT EXISTS login_bg_opacity DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS login_card_width INTEGER,
ADD COLUMN IF NOT EXISTS login_card_height INTEGER,
ADD COLUMN IF NOT EXISTS login_heading_size INTEGER,
ADD COLUMN IF NOT EXISTS login_input_size INTEGER,
ADD COLUMN IF NOT EXISTS login_label_size INTEGER,
ADD COLUMN IF NOT EXISTS login_card_border_width INTEGER,
ADD COLUMN IF NOT EXISTS login_card_glow_size INTEGER,
ADD COLUMN IF NOT EXISTS login_card_glow_opacity INTEGER,
-- Login Design (Mobile)
ADD COLUMN IF NOT EXISTS login_mobile_bg_url TEXT,
ADD COLUMN IF NOT EXISTS login_mobile_logo_url TEXT,
ADD COLUMN IF NOT EXISTS login_mobile_card_opacity DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS login_mobile_card_color TEXT,
ADD COLUMN IF NOT EXISTS login_mobile_logo_scale DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS login_mobile_logo_x_offset INTEGER,
ADD COLUMN IF NOT EXISTS login_mobile_logo_y_offset INTEGER,
ADD COLUMN IF NOT EXISTS login_mobile_bg_blur INTEGER,
ADD COLUMN IF NOT EXISTS login_mobile_bg_brightness DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS login_mobile_bg_zoom DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS login_mobile_bg_x_offset INTEGER,
ADD COLUMN IF NOT EXISTS login_mobile_bg_y_offset INTEGER,
ADD COLUMN IF NOT EXISTS login_mobile_card_x_offset INTEGER,
ADD COLUMN IF NOT EXISTS login_mobile_card_y_offset INTEGER,
ADD COLUMN IF NOT EXISTS login_mobile_card_border_color TEXT,
ADD COLUMN IF NOT EXISTS login_mobile_card_scale DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS login_mobile_show_logo BOOLEAN,
ADD COLUMN IF NOT EXISTS login_mobile_text_color TEXT,
ADD COLUMN IF NOT EXISTS login_mobile_accent_color TEXT,
ADD COLUMN IF NOT EXISTS login_mobile_logo_opacity DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS login_mobile_bg_fit TEXT,
ADD COLUMN IF NOT EXISTS login_mobile_bg_opacity DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS login_mobile_card_width INTEGER,
ADD COLUMN IF NOT EXISTS login_mobile_card_height INTEGER;

ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS font_scale DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS text_color_base TEXT,
ADD COLUMN IF NOT EXISTS text_color_muted TEXT,
ADD COLUMN IF NOT EXISTS border_radius TEXT,
ADD COLUMN IF NOT EXISTS glass_opacity DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS surface_color TEXT,
ADD COLUMN IF NOT EXISTS hover_color TEXT,
ADD COLUMN IF NOT EXISTS input_bg_color TEXT,
ADD COLUMN IF NOT EXISTS brand_label_color TEXT,
ADD COLUMN IF NOT EXISTS premium_badge_color TEXT,
ADD COLUMN IF NOT EXISTS menu_icon_color TEXT,
ADD COLUMN IF NOT EXISTS clock_position TEXT DEFAULT 'dashboard',
ADD COLUMN IF NOT EXISTS clock_integration BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS weather_integration BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS academy_name TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS gym_address TEXT,
ADD COLUMN IF NOT EXISTS gym_phone TEXT,
ADD COLUMN IF NOT EXISTS search_icon_color TEXT,
ADD COLUMN IF NOT EXISTS search_bg_color TEXT,
ADD COLUMN IF NOT EXISTS search_border_color TEXT,
ADD COLUMN IF NOT EXISTS search_text_color TEXT,
ADD COLUMN IF NOT EXISTS hover_border_color TEXT;

-- [1] Create 'coaches' table (Links to profiles)
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

-- Sync any existing profiles into coaches table
INSERT INTO public.coaches (profile_id, full_name, email, role)
SELECT id, full_name, email, CAST(role AS TEXT)
FROM public.profiles
WHERE role IN ('coach', 'head_coach', 'admin')
ON CONFLICT (profile_id) DO NOTHING;

-- [2] Create 'training_groups' table
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

-- [3] Create 'pt_sessions' table (Daily Log)
CREATE TABLE IF NOT EXISTS public.pt_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID REFERENCES public.coaches(id) ON DELETE CASCADE,
    student_name TEXT,
    sessions_count INTEGER DEFAULT 1,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- [4] Update Relationships in existing tables
-- Update students to link to coaches table
ALTER TABLE public.students DROP COLUMN IF EXISTS coach_id CASCADE;
ALTER TABLE public.students ADD COLUMN coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS training_group_id UUID REFERENCES public.training_groups(id) ON DELETE SET NULL;

-- Update pt_subscriptions to link to coaches table
ALTER TABLE public.pt_subscriptions DROP COLUMN IF EXISTS coach_id CASCADE;
ALTER TABLE public.pt_subscriptions ADD COLUMN coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL;

-- Update coach_attendance to link to coaches table
ALTER TABLE public.coach_attendance DROP COLUMN IF EXISTS coach_id CASCADE;
ALTER TABLE public.coach_attendance ADD COLUMN coach_id UUID REFERENCES public.coaches(id) ON DELETE CASCADE;

-- [5] Enable RLS & Policies
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all authenticated read" ON public.coaches;
CREATE POLICY "Allow all authenticated read" ON public.coaches FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow admin manage coaches" ON public.coaches;
CREATE POLICY "Allow admin manage coaches" ON public.coaches FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Allow all authenticated read groups" ON public.training_groups;
CREATE POLICY "Allow all authenticated read groups" ON public.training_groups FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow admin manage groups" ON public.training_groups;
CREATE POLICY "Allow admin manage groups" ON public.training_groups FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Allow all authenticated read sessions" ON public.pt_sessions;
CREATE POLICY "Allow all authenticated read sessions" ON public.pt_sessions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow auth write sessions" ON public.pt_sessions;
CREATE POLICY "Allow auth write sessions" ON public.pt_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- [6] Enable Realtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'coaches') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.coaches;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'training_groups') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.training_groups;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'pt_sessions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pt_sessions;
  END IF;
END $$;

NOTIFY pgrst, 'reload';

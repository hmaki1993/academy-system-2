-- COMPREHENSIVE FIX FOR STUDENTS & RELATED TABLES (FINAL V4)
-- This script fixes ALL schema errors identified in the console logs.

-- 1. Create 'subscription_plans' table if not exists
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    price DECIMAL(10, 2) DEFAULT 0,
    duration_months INTEGER DEFAULT 1,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for subscription_plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to all users" ON public.subscription_plans;
CREATE POLICY "Allow read access to all users" ON public.subscription_plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage plans" ON public.subscription_plans;
CREATE POLICY "Admins can manage plans" ON public.subscription_plans FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 2. Create 'training_groups' table if not exists
CREATE TABLE IF NOT EXISTS public.training_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
    schedule JSONB DEFAULT '[]'::jsonb, 
    capacity INTEGER DEFAULT 20,
    level TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for training_groups
ALTER TABLE public.training_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to all users" ON public.training_groups;
CREATE POLICY "Allow read access to all users" ON public.training_groups FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins/Coaches can manage groups" ON public.training_groups;
CREATE POLICY "Admins/Coaches can manage groups" ON public.training_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Create 'student_training_schedule' table if not exists (MISSING TABLE FIX)
CREATE TABLE IF NOT EXISTS public.student_training_schedule (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL,
    start_time TIME WITHOUT TIME ZONE,
    end_time TIME WITHOUT TIME ZONE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for student_training_schedule
ALTER TABLE public.student_training_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to all users" ON public.student_training_schedule;
CREATE POLICY "Allow read access to all users" ON public.student_training_schedule FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins/Coaches can manage schedules" ON public.student_training_schedule;
CREATE POLICY "Admins/Coaches can manage schedules" ON public.student_training_schedule FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Fix Students Table Columns (Adding EVERYTHING used in AddStudentForm)
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS father_name TEXT,
ADD COLUMN IF NOT EXISTS mother_name TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS contact_number TEXT,
ADD COLUMN IF NOT EXISTS parent_contact TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'male',
ADD COLUMN IF NOT EXISTS training_type TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS training_schedule JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS subscription_plan_id UUID,
ADD COLUMN IF NOT EXISTS training_group_id UUID,
ADD COLUMN IF NOT EXISTS subscription_expiry DATE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS coach_id UUID;

-- 5. Fix Payments Table Columns (MISSING COLUMN FIX)
-- Frontend expects 'payment_date', 'payment_method', 'notes', 'student_id', 'amount'
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS payment_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id) ON DELETE SET NULL;
-- Note: 'amount' likely exists, but 'date' and 'method' were likely the old names. 
-- We add the new expected names.

-- 6. Fix 'subscription_plans' Relationship
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'students_subscription_plan_id_fkey'
    ) THEN
        ALTER TABLE public.students DROP CONSTRAINT students_subscription_plan_id_fkey;
    END IF;
END $$;

ALTER TABLE public.students
ADD CONSTRAINT students_subscription_plan_id_fkey
FOREIGN KEY (subscription_plan_id)
REFERENCES public.subscription_plans(id)
ON DELETE SET NULL;

-- 7. Fix 'training_groups' Relationship
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'students_training_group_id_fkey'
    ) THEN
        ALTER TABLE public.students DROP CONSTRAINT students_training_group_id_fkey;
    END IF;
END $$;

ALTER TABLE public.students
ADD CONSTRAINT students_training_group_id_fkey
FOREIGN KEY (training_group_id)
REFERENCES public.training_groups(id)
ON DELETE SET NULL;

-- 8. Fix 'coaches' Relationship
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'students_coach_id_fkey'
    ) THEN
        ALTER TABLE public.students DROP CONSTRAINT students_coach_id_fkey;
    END IF;
END $$;

ALTER TABLE public.students
ADD CONSTRAINT students_coach_id_fkey
FOREIGN KEY (coach_id)
REFERENCES public.coaches(id)
ON DELETE SET NULL;

-- 9. Force Schema Refresh via Comments
COMMENT ON TABLE public.students IS 'Students table - Schema Refreshed (Forced Reload)';
COMMENT ON TABLE public.payments IS 'Payments table - Schema Refreshed (Forced Reload)';
COMMENT ON TABLE public.student_training_schedule IS 'Student Schedules table - Schema Refreshed (Forced Reload)';

-- 10. Reload Schema Cache
NOTIFY pgrst, 'reload';

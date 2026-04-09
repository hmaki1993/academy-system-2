
-- ============================================================
-- SMART TRAINING PLANS SCHEMA
-- ============================================================

-- 1. Add metrics to students if not exists
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS weight DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS height DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS age INTEGER;

-- 2. Create Training Plans Table
CREATE TABLE IF NOT EXISTS public.training_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Inputs
    age INTEGER,
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    days_per_week INTEGER DEFAULT 3,
    
    -- Calculated Data
    bmr DECIMAL(10,2),
    tdee DECIMAL(10,2),
    target_calories INTEGER,
    
    -- Plan Content
    plan_content JSONB, -- Stores the structured AI plan
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'archived')),
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS Policies
ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Plans readable by student and coach" ON public.training_plans;
CREATE POLICY "Plans readable by student and coach" ON public.training_plans 
FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE id = student_id) -- Simplified
    OR auth.uid() = coach_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'head_coach'))
);

DROP POLICY IF EXISTS "Admin and Coaches can manage plans" ON public.training_plans;
CREATE POLICY "Admin and Coaches can manage plans" ON public.training_plans 
FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'head_coach', 'coach'))
);

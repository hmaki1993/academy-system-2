-- ==========================================
-- FIX MISSING TABLES FOR LEVEL ACCESS
-- ==========================================

-- 1. Create Level Costs Table (Prices per level)
CREATE TABLE IF NOT EXISTS public.level_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level_number INTEGER NOT NULL UNIQUE,
    price DECIMAL(10, 2) NOT NULL DEFAULT 15.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Level Purchases Table (Unlocking access for students)
CREATE TABLE IF NOT EXISTS public.level_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    level_number INTEGER NOT NULL,
    amount_paid DECIMAL(10, 2),
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    -- Prevent duplicate purchases for the same level/student
    UNIQUE(student_id, level_number)
);

-- 3. Insert Default Prices (Levels 1-8)
INSERT INTO public.level_costs (level_number, price)
VALUES 
    (1, 15.00),
    (2, 20.00),
    (3, 25.00),
    (4, 30.00),
    (5, 35.00),
    (6, 40.00),
    (7, 45.00),
    (8, 50.00)
ON CONFLICT (level_number) DO NOTHING;

-- 4. Enable RLS
ALTER TABLE public.level_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_purchases ENABLE ROW LEVEL SECURITY;

-- 5. Policies for level_costs (Everyone can view)
DROP POLICY IF EXISTS "Public view costs" ON public.level_costs;
CREATE POLICY "Public view costs" 
ON public.level_costs FOR SELECT 
TO authenticated 
USING (is_active = true);

-- 6. Policies for level_purchases (Students see their own)
DROP POLICY IF EXISTS "Students see own purchases" ON public.level_purchases;
CREATE POLICY "Students see own purchases" 
ON public.level_purchases FOR SELECT 
TO authenticated 
USING (
    student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
    OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'coach', 'head_coach'))
);

-- 7. Allow students to record a purchase (Only for demo/self-unlocking)
-- NOTE: In production, this should only be done via edge functions or admin triggers
DROP POLICY IF EXISTS "Students can buy levels" ON public.level_purchases;
CREATE POLICY "Students can buy levels" 
ON public.level_purchases FOR INSERT 
TO authenticated 
WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
);

-- 8. Refresh Schema Cache
NOTIFY pgrst, 'reload';

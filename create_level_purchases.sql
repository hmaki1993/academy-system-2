-- Create Level Purchases Table
CREATE TABLE IF NOT EXISTS public.level_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    level_number INTEGER NOT NULL,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(student_id, level_number)
);

-- Enable RLS
ALTER TABLE public.level_purchases ENABLE ROW LEVEL SECURITY;

-- Policies for level_purchases
CREATE POLICY "Admins can manage all purchases" ON public.level_purchases
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'head_coach')
        )
    );

CREATE POLICY "Students can view their own purchases" ON public.level_purchases
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.students
            WHERE students.id = level_purchases.student_id AND students.profile_id = auth.uid()
        )
    );

-- Create Level Costs Table (Optional but useful for dynamic pricing)
CREATE TABLE IF NOT EXISTS public.level_costs (
    level_number INTEGER PRIMARY KEY,
    price DECIMAL(10, 2) NOT NULL DEFAULT 15.00,
    currency TEXT DEFAULT 'KWD',
    is_active BOOLEAN DEFAULT true
);

-- Seed some default costs for levels 1-8
INSERT INTO public.level_costs (level_number, price)
VALUES 
    (1, 0.00), -- Level 1 is free
    (2, 10.00),
    (3, 15.00),
    (4, 15.00),
    (5, 20.00),
    (6, 20.00),
    (7, 25.00),
    (8, 30.00)
ON CONFLICT (level_number) DO NOTHING;

-- Grant permissions
GRANT ALL ON public.level_purchases TO authenticated;
GRANT ALL ON public.level_costs TO authenticated;

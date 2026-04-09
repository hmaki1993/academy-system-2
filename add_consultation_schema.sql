-- 1. Add settings to gym_settings
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS consultation_fee NUMERIC DEFAULT 50.00;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS consultation_duration_mins INT DEFAULT 30;

-- 2. Create Availability Table
CREATE TABLE IF NOT EXISTS public.consultation_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert some default availability (e.g., Monday to Thursday, 16:00 to 20:00)
INSERT INTO public.consultation_availability (day_of_week, start_time, end_time)
VALUES 
    (1, '16:00', '20:00'),
    (2, '16:00', '20:00'),
    (3, '16:00', '20:00'),
    (4, '16:00', '20:00')
ON CONFLICT DO NOTHING;

-- 3. Create existing requests table
CREATE TABLE IF NOT EXISTS public.consultation_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    fitness_goals TEXT,
    booked_date DATE NOT NULL,
    booked_time TIME NOT NULL,
    amount_paid NUMERIC NOT NULL,
    transaction_id TEXT,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'completed', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.consultation_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_requests ENABLE ROW LEVEL SECURITY;

-- Anonymous can read availability
CREATE POLICY "Enable read access for all users on consultation_availability" ON public.consultation_availability FOR SELECT USING (true);
CREATE POLICY "Enable insert for anonymous users on consultation_requests" ON public.consultation_requests FOR INSERT WITH CHECK (true);

-- Admins can do anything
CREATE POLICY "Enable all access for admins on consultation_availability" ON public.consultation_availability FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'head_coach'))
);
CREATE POLICY "Enable all access for admins on consultation_requests" ON public.consultation_requests FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'head_coach'))
);

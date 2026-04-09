-- ============================================================
-- PT CALENDAR SYSTEM — FULL UNIVERSAL SETUP & FIX
-- This script creates the tables from scratch with Calendar support
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create PT Availability Table (with date-specific support)
CREATE TABLE IF NOT EXISTS public.pt_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID REFERENCES public.coaches(id) ON DELETE CASCADE,
    day_of_week SMALLINT CHECK (day_of_week BETWEEN 0 AND 6), -- Nullable for date-specific
    specific_date DATE, -- New: for Calendar mode
    time_slots TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (coach_id, day_of_week, specific_date)
);

-- 2. Create PT Bookings Table
CREATE TABLE IF NOT EXISTS public.pt_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
    student_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    student_name TEXT,
    booking_date DATE NOT NULL,
    time_slot TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    payment_method TEXT,
    amount NUMERIC(10,3),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.pt_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_bookings ENABLE ROW LEVEL SECURITY;

-- 4. Policies for pt_availability
DROP POLICY IF EXISTS "pt_availability_read" ON pt_availability;
CREATE POLICY "pt_availability_read" ON pt_availability FOR SELECT USING (true);

DROP POLICY IF EXISTS "pt_availability_write" ON pt_availability;
CREATE POLICY "pt_availability_write" ON pt_availability FOR ALL 
USING (auth.uid() IN (SELECT profile_id FROM coaches) OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'head_coach')));

-- 5. Policies for pt_bookings
DROP POLICY IF EXISTS "pt_bookings_insert" ON pt_bookings;
CREATE POLICY "pt_bookings_insert" ON pt_bookings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "pt_bookings_select_own" ON pt_bookings;
CREATE POLICY "pt_bookings_select_own" ON pt_bookings FOR SELECT USING (
    student_id = auth.uid() 
    OR coach_id IN (SELECT id FROM coaches WHERE profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'head_coach', 'reception'))
);

DROP POLICY IF EXISTS "pt_bookings_update" ON pt_bookings;
CREATE POLICY "pt_bookings_update" ON pt_bookings FOR UPDATE USING (
    student_id = auth.uid()
    OR coach_id IN (SELECT id FROM coaches WHERE profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'head_coach'))
);

DROP POLICY IF EXISTS "pt_bookings_delete" ON pt_bookings;
CREATE POLICY "pt_bookings_delete" ON pt_bookings FOR DELETE USING (
    (student_id = auth.uid() AND status IN ('pending', 'cancelled'))
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'head_coach'))
);

-- 6. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pt_availability_updated_at ON pt_availability;
CREATE TRIGGER pt_availability_updated_at BEFORE UPDATE ON pt_availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS pt_bookings_updated_at ON pt_bookings;
CREATE TRIGGER pt_bookings_updated_at BEFORE UPDATE ON pt_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

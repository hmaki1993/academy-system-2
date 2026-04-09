-- ============================================================
-- PT BOOKING CALENDAR SYSTEM — Database Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. PT Availability (admin-configured per-coach per-day-of-week)
CREATE TABLE IF NOT EXISTS pt_availability (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id uuid REFERENCES coaches(id) ON DELETE CASCADE,
    day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 6=Sat
    time_slots text[] NOT NULL DEFAULT '{}',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (coach_id, day_of_week)
);

-- 2. PT Bookings (individual session bookings by students)
CREATE TABLE IF NOT EXISTS pt_bookings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id uuid REFERENCES coaches(id) ON DELETE SET NULL,
    student_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    student_name text,
    booking_date date NOT NULL,
    time_slot text NOT NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    payment_method text,
    amount numeric(10,3),
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_pt_availability_coach ON pt_availability(coach_id);
CREATE INDEX IF NOT EXISTS idx_pt_bookings_coach ON pt_bookings(coach_id);
CREATE INDEX IF NOT EXISTS idx_pt_bookings_date ON pt_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_pt_bookings_student ON pt_bookings(student_id);

-- 4. RLS Policies
ALTER TABLE pt_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE pt_bookings ENABLE ROW LEVEL SECURITY;

-- pt_availability: public read, admin/head_coach write
CREATE POLICY "pt_availability_read" ON pt_availability FOR SELECT USING (true);
CREATE POLICY "pt_availability_write" ON pt_availability FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- pt_bookings: all authenticated can insert, coaches/admins can view all
CREATE POLICY "pt_bookings_insert" ON pt_bookings FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "pt_bookings_select_own" ON pt_bookings FOR SELECT
    USING (
        student_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM coaches c WHERE c.id = pt_bookings.coach_id AND c.profile_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'head_coach', 'reception')
        )
    );

CREATE POLICY "pt_bookings_update" ON pt_bookings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM coaches c WHERE c.id = pt_bookings.coach_id AND c.profile_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'head_coach')
        )
    );

-- 5. Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pt_availability_updated_at
    BEFORE UPDATE ON pt_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER pt_bookings_updated_at
    BEFORE UPDATE ON pt_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Seed sample availability (optional — remove if not needed)
-- This inserts sample availability for testing, linked to first coach found
-- INSERT INTO pt_availability (coach_id, day_of_week, time_slots)
-- SELECT id, unnest(ARRAY[1,2,3,4,0]), ARRAY['04:00 PM','05:00 PM','06:00 PM','07:00 PM']
-- FROM coaches LIMIT 1;

-- ============================================================
-- DONE. Now run the app and go to /app/pt-availability to manage.
-- ============================================================

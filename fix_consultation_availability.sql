-- 1. إضافة عمود التاريخ المحدد (specific_date) للجدول
ALTER TABLE public.consultation_availability ADD COLUMN IF NOT EXISTS specific_date DATE;

-- 2. مسح أي بيانات قديمة لأننا غيرنا النظام لـ DATE
DELETE FROM public.consultation_availability;

-- 3. إضافة مواعيد تجريبية لشهر أبريل 2026
-- (يوم 15 و 16 و 17 أبريل)
INSERT INTO public.consultation_availability (specific_date, start_time, end_time, is_active)
VALUES 
    ('2026-04-15', '16:00', '17:00', true),
    ('2026-04-15', '17:00', '18:00', true),
    ('2026-04-16', '10:00', '11:00', true),
    ('2026-04-16', '11:00', '12:00', true),
    ('2026-04-17', '18:00', '19:00', true),
    ('2026-04-17', '19:00', '20:00', true)
ON CONFLICT DO NOTHING;

-- 4. التأكد من صلاحيات القراءة للجميع
DROP POLICY IF EXISTS "Enable read access for all users on consultation_availability" ON public.consultation_availability;
CREATE POLICY "Enable read access for all users on consultation_availability" ON public.consultation_availability FOR SELECT USING (true);

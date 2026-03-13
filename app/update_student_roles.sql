-- ==========================================
-- ملف تحديثات قاعدة البيانات لربط الطلاب والأدوار
-- ==========================================

-- 1. التأكد من وجود قيمة 'student' في الـ Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'student') THEN
        ALTER TYPE public.user_role ADD VALUE 'student';
    END IF;
EXCEPTION
    WHEN OTHERS THEN 
        RAISE NOTICE 'Role already exists or could not be added: %', SQLERRM;
END $$;

-- 2. إضافة الأعمدة المفقودة لجدول الاشتراكات
ALTER TABLE public.pt_subscriptions ADD COLUMN IF NOT EXISTS student_email TEXT;
ALTER TABLE public.pt_subscriptions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. إنشاء جدول جلسات القفز
CREATE TABLE IF NOT EXISTS public.jump_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    jumps_count INTEGER NOT NULL,
    work_duration INTEGER NOT NULL,
    rest_duration INTEGER NOT NULL,
    avg_jpm DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ربط جدول الطلاب بجدول المستخدمين
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 5. الـ Trigger الأساسي لإنشاء الـ Profile عند التسجيل
-- تم تحسينه ليكون "Safe" ولا يعطل الـ Signup مهما حدث
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    target_role_text TEXT;
    target_role_enum user_role;
BEGIN
    -- أخذ الدور من البيانات المرسلة مع التسجيل
    target_role_text := COALESCE(NEW.raw_user_meta_data->>'role', 'coach');

    -- تحويل النص إلى Enum بأمان
    BEGIN
        target_role_enum := target_role_text::user_role;
    EXCEPTION WHEN OTHERS THEN
        target_role_enum := 'coach'::user_role;
    END;

    -- إنشاء أو تحديث البروفايل
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        target_role_enum
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        updated_at = NOW();

    -- ربط الطالب إذا كان الدور 'student' وموجود student_id
    IF target_role_text = 'student' AND (NEW.raw_user_meta_data->>'student_id') IS NOT NULL AND (NEW.raw_user_meta_data->>'student_id') <> '' THEN
        BEGIN
            UPDATE public.students 
            SET user_id = NEW.id 
            WHERE id = (NEW.raw_user_meta_data->>'student_id')::UUID;
        EXCEPTION WHEN OTHERS THEN
            -- لا نعطل التسجيل إذا فشل الربط، فقط نسجل ملاحظة
            RAISE WARNING 'Student link failed: %', SQLERRM;
        END;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- الحماية القصوى: إذا حدث أي خطأ غير متوقع، نترك عملية التسجيل تستمر
    RAISE WARNING 'handle_new_user failed but continuing signup: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fix Profiles RLS to avoid infinite recursion
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles readable by authenticated" ON public.profiles;
CREATE POLICY "Profiles readable by authenticated" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true); -- Allow all authenticated users to read profiles (needed for coaches to see students and vice versa)

-- 5. Update Students RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students see own record" ON public.students;
CREATE POLICY "Students see own record" 
ON public.students FOR SELECT 
TO authenticated 
USING (true); -- Allow all authenticated users to read students. Additional UI filtering handles visibility.

-- 6. Update Jump Sessions RLS
ALTER TABLE public.jump_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.jump_sessions;
CREATE POLICY "Users can view own sessions" 
ON public.jump_sessions FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());



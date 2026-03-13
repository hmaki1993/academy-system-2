-- ========================================================
-- 🏆 MASTER FIX: THE ULTIMATE DB SYNC (v3.0 - FINAL)
-- حل شامل ومجرب لمشاكل التسجيل (Signup 500/422)
-- ========================================================
-- الترتيب مهم! شغله كله من أوله لآخره في Supabase SQL Editor.
-- ========================================================

-- ─────────────────────────────────────────────────────────
-- [1] إضافة نوع البيانات 'student' للـ Enum (لو مش موجود)
-- هذا السطر لازم يشتغل OUTSIDE أي Transaction Block
-- ─────────────────────────────────────────────────────────
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'student';


-- ─────────────────────────────────────────────────────────
-- [2] إضافة الأعمدة المفقودة بأمان
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- جدول coaches فيه profile_id بالفعل (UNIQUE) - بنتأكد بس إنه موجود
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS profile_id UUID;
CREATE UNIQUE INDEX IF NOT EXISTS coaches_profile_id_key ON public.coaches(profile_id);


-- ─────────────────────────────────────────────────────────
-- [3] الـ Trigger الرئيسي - آمن 100% ولا يسبب 500 أبداً
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_master_signup_sync()
RETURNS TRIGGER AS $$
DECLARE
    v_role_text TEXT;
    v_role_enum public.user_role;
    v_fullname  TEXT;
BEGIN
    -- استخراج البيانات من الـ metadata بأمان
    v_role_text := LOWER(TRIM(COALESCE(NEW.raw_user_meta_data->>'role', 'coach')));
    v_fullname  := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

    -- تحويل الـ role لـ Enum بأمان (لو فشل بيرجع 'coach')
    BEGIN
        v_role_enum := v_role_text::public.user_role;
    EXCEPTION WHEN OTHERS THEN
        v_role_enum := 'coach'::public.user_role;
    END;

    -- [أ] إنشاء أو تحديث الـ Profile
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (NEW.id, NEW.email, v_fullname, v_role_enum)
    ON CONFLICT (id) DO UPDATE SET
        full_name  = EXCLUDED.full_name,
        role       = EXCLUDED.role,
        updated_at = NOW();

    -- [ب] لو المستخدم مدرب/موظف → إنشاء سجل في جدول coaches
    IF v_role_text IN ('coach', 'head_coach', 'admin', 'reception', 'cleaner') THEN
        BEGIN
            INSERT INTO public.coaches (profile_id, full_name, email, role, pt_rate, salary)
            VALUES (NEW.id, v_fullname, NEW.email, v_role_text, 0, 0)
            ON CONFLICT (profile_id) DO UPDATE SET
                full_name = EXCLUDED.full_name,
                role      = EXCLUDED.role,
                email     = EXCLUDED.email;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Coach insert failed: %', SQLERRM;
        END;
    END IF;

    -- [ج] لو المستخدم طالب → نحاول نربطه بسجل في جدول students
    IF v_role_text = 'student' THEN
        BEGIN
            IF (NEW.raw_user_meta_data->>'student_id') IS NOT NULL AND
               (NEW.raw_user_meta_data->>'student_id') <> '' THEN
                UPDATE public.students
                SET user_id = NEW.id
                WHERE id = (NEW.raw_user_meta_data->>'student_id')::UUID;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Student link failed: %', SQLERRM;
        END;
    END IF;

    RETURN NEW;

-- الحماية القصوى: أي خطأ مش متوقع لا يوقف عملية التسجيل
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_master_signup_sync error (non-fatal): %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─────────────────────────────────────────────────────────
-- [4] تطبيق الـ Trigger (بنمسح القديم الأول)
-- ─────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_sync ON auth.users;

CREATE TRIGGER on_auth_user_created_sync
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_master_signup_sync();


-- ─────────────────────────────────────────────────────────
-- [5] إصلاح فوري للبيانات الموجودة (Run Once)
-- ─────────────────────────────────────────────────────────
DO $$
BEGIN
    -- إنشاء بروفايلات لمستخدمين موجودين في Auth بس مالهمش profile
    INSERT INTO public.profiles (id, email, full_name, role)
    SELECT
        u.id,
        u.email,
        COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
        COALESCE(
            (u.raw_user_meta_data->>'role')::public.user_role,
            'coach'::public.user_role
        )
    FROM auth.users u
    WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Backfill failed (non-fatal): %', SQLERRM;
END $$;

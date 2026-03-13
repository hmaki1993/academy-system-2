-- Update handle_new_user to also link PT subscriptions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    target_role user_role;
    target_student_id UUID;
    target_pt_id UUID;
BEGIN
    -- Determine role from metadata or default to 'coach'
    target_role := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'coach');
    target_student_id := (NEW.raw_user_meta_data->>'student_id')::UUID;
    target_pt_id := (NEW.raw_user_meta_data->>'pt_id')::UUID;

    -- Insert into profiles
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        target_role
    );

    -- If it's a student and we have a student_id, link it in students table
    IF target_role::TEXT = 'student' AND target_student_id IS NOT NULL THEN
        UPDATE public.students 
        SET user_id = NEW.id 
        WHERE id = target_student_id;
    END IF;

    -- Also link in pt_subscriptions if pt_id is provided
    IF target_pt_id IS NOT NULL THEN
        UPDATE public.pt_subscriptions 
        SET user_id = NEW.id 
        WHERE id = target_pt_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

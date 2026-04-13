-- ============================================================
-- SQL_FIX_03_OPTIMIZATION: Server-side Student/Group Sync (RPC)
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_students_to_groups_rpc()
RETURNS json AS $$
DECLARE
    student_record RECORD;
    existing_group_id UUID;
    new_group_id UUID;
    group_name_var TEXT;
    schedule_key_var TEXT;
    days_var TEXT[];
    start_time_var TEXT;
    updated_count INTEGER := 0;
BEGIN
    -- Loop through all students who have a coach and a training schedule
    FOR student_record IN 
        SELECT id, full_name, coach_id, training_schedule, training_days, training_group_id 
        FROM public.students 
        WHERE coach_id IS NOT NULL 
        AND training_schedule IS NOT NULL 
        AND jsonb_array_length(training_schedule) > 0
    LOOP
        -- 1. Generate Schedule Key (simplified version of frontend logic)
        -- We'll just sort the schedule entries by day and time for comparison
        SELECT string_agg(day || ':' || start_time || ':' || end_time, '|' ORDER BY day, start_time)
        INTO schedule_key_var
        FROM jsonb_to_recordset(student_record.training_schedule) AS x(day TEXT, start_time TEXT, end_time TEXT);

        -- 2. Generate Group Name
        -- We'll take the first start time and all days
        days_var := student_record.training_days;
        IF array_length(days_var, 1) IS NULL THEN
             SELECT array_agg(day) INTO days_var FROM (SELECT x.day FROM jsonb_to_recordset(student_record.training_schedule) AS x(day TEXT)) sub;
        END IF;
        
        start_time_var := student_record.training_schedule->0->>'start';
        group_name_var := array_to_string(days_var, '/') || ' ' || start_time_var;

        -- 3. Find or Create Group
        SELECT id INTO existing_group_id 
        FROM public.groups 
        WHERE coach_id = student_record.coach_id 
        AND (schedule_key = schedule_key_var OR name = group_name_var)
        LIMIT 1;

        IF existing_group_id IS NULL THEN
            INSERT INTO public.groups (coach_id, name, days, start_time, schedule_key)
            VALUES (
                student_record.coach_id, 
                group_name_var, 
                days_var, 
                CASE WHEN start_time_var ~ '^[0-9:]+$' THEN start_time_var::TIME ELSE NULL END, 
                schedule_key_var
            )
            RETURNING id INTO new_group_id;
            existing_group_id := new_group_id;
        END IF;

        -- 4. Update Student if needed
        IF student_record.training_group_id IS DISTINCT FROM existing_group_id THEN
            UPDATE public.students SET training_group_id = existing_group_id WHERE id = student_record.id;
            updated_count := updated_count + 1;
        END IF;
    END LOOP;

    RETURN json_build_object('success', true, 'updated_count', updated_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.sync_students_to_groups_rpc TO authenticated;

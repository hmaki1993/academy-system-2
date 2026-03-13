DO $$
DECLARE
    coach_id_val UUID;
    student_id_val BIGINT;
    plan_id UUID := '62df24e3-c06c-42e7-9e6f-f1c0cd24e6e7'; -- Using "one time " plan
    group_id UUID;
    i INTEGER;
    j INTEGER;
BEGIN
    -- 1. Create 20 Coaches
    FOR i IN 1..20 LOOP
        INSERT INTO coaches (full_name, role, phone, is_active)
        VALUES ('Coach Stress ' || i, 'coach', '012345678' || i, true)
        RETURNING id INTO coach_id_val;

        -- Create a training group for each coach
        INSERT INTO training_groups (name, coach_id, schedule_key)
        VALUES ('Group ' || i, coach_id_val, 'sat:10:00|mon:10:00|wed:10:00')
        RETURNING id INTO group_id;

        -- 2. Create ~25 Students per Coach (Total 500)
        FOR j IN 1..25 LOOP
            INSERT INTO students (
                full_name, 
                age, 
                training_days, 
                coach_id, 
                training_group_id, 
                subscription_plan_id, 
                training_schedule,
                is_active
            )
            VALUES (
                'Gymnast Stress ' || i || '-' || j, 
                7 + (j % 10), 
                ARRAY['sat', 'mon', 'wed'], 
                coach_id_val, 
                group_id, 
                plan_id, 
                '[{"day": "sat", "start": "10:00", "end": "11:30"}, {"day": "mon", "start": "10:00", "end": "11:30"}, {"day": "wed", "start": "10:00", "end": "11:30"}]'::jsonb,
                true
            )
            RETURNING id INTO student_id_val;

            -- Create a payment for each student
            INSERT INTO payments (student_id, amount, status, payment_date)
            VALUES (student_id_val, 500, 'paid', CURRENT_DATE);
        END LOOP;

        -- 3. Create a PT Subscription for some coaches (Total 30)
        IF i <= 30 THEN
            INSERT INTO pt_subscriptions (
                student_id,
                coach_id,
                total_sessions,
                remaining_sessions,
                status,
                price
            )
            SELECT 
                id, 
                coach_id_val, 
                12, 
                12, 
                'active', 
                1200
            FROM students 
            WHERE full_name = 'Gymnast Stress ' || i || '-1'
            LIMIT 1;
        END IF;
    END LOOP;
END $$;

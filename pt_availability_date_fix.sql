-- PT Availability Date-Specific Migration
ALTER TABLE pt_availability ADD COLUMN IF NOT EXISTS specific_date DATE;
ALTER TABLE pt_availability ALTER COLUMN day_of_week DROP NOT NULL;

-- Remove old unique constraint if it exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pt_availability_coach_id_day_of_week_key') THEN
        ALTER TABLE pt_availability DROP CONSTRAINT pt_availability_coach_id_day_of_week_key;
    END IF;
END $$;

-- Add new composite unique constraint to allow multiple dates/days per coach
ALTER TABLE pt_availability DROP CONSTRAINT IF EXISTS pt_availability_composite_key;
ALTER TABLE pt_availability ADD CONSTRAINT pt_availability_composite_key UNIQUE (coach_id, day_of_week, specific_date);

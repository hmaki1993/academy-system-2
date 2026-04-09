-- Allow users to update their own presence (last_active_at)
DROP POLICY IF EXISTS "Users can update their own presence" ON public.profiles;

CREATE POLICY "Users can update their own presence" ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Ensure Realtime is enabled for training_plans (crucial for direct broadcasts)
ALTER TABLE public.training_plans REPLICA IDENTITY FULL;

-- Check if training_plans is in the realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'training_plans'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.training_plans;
  END IF;
END $$;

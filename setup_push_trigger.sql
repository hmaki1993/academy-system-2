-- SETUP PUSH TRIGGER
-- Automatically calls the 'send-push' edge function when a mission is created

-- 1. Create the function that calls the edge function
CREATE OR REPLACE FUNCTION public.handle_new_coach_notification()
RETURNS TRIGGER AS $$
DECLARE
  project_id TEXT := 'akbpfyjszuuwyraoalyf'; 
  edge_url TEXT := 'https://' || project_id || '.supabase.co/functions/v1/send-push';
  anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; -- Placeholder, Supabase handles internal auth usually
BEGIN
  -- Only trigger for missions ('coach' type) sent to a specific user
  IF (NEW.type = 'coach' AND NEW.user_id IS NOT NULL) THEN
    PERFORM
      net.http_post(
        url := edge_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || anon_key
        ),
        body := jsonb_build_object(
          'userId', NEW.user_id,
          'title', NEW.title,
          'message', NEW.message,
          'url', '/app/jump-rope' -- Redirect to training
        ),
        timeout_milliseconds := 5000
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS on_coach_notification_added ON public.notifications;
CREATE TRIGGER on_coach_notification_added
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_coach_notification();

-- 3. Note: Ensure 'pg_net' extension is enabled in Supabase Dashboard -> Extensions
-- CREATE EXTENSION IF NOT EXISTS pg_net;

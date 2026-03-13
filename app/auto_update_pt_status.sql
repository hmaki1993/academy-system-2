-- Function to automatically update PT subscription status based on expiry date
CREATE OR REPLACE FUNCTION update_pt_subscription_status()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update subscriptions to 'expired' if expiry_date has passed
    UPDATE pt_subscriptions
    SET status = 'expired'
    WHERE status = 'active'
    AND expiry_date < CURRENT_DATE;
    
    -- Update subscriptions to 'completed' if all sessions are used
    UPDATE pt_subscriptions
    SET status = 'completed'
    WHERE status = 'active'
    AND sessions_remaining = 0;
END;
$$;

-- Create a scheduled job to run this function daily (requires pg_cron extension)
-- Note: This requires the pg_cron extension to be enabled
-- You can also call this function manually or via a cron job

-- Optional: Create a trigger to check status on any update
CREATE OR REPLACE FUNCTION check_pt_subscription_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Auto-expire if date has passed
    IF NEW.expiry_date < CURRENT_DATE AND NEW.status = 'active' THEN
        NEW.status = 'expired';
    END IF;
    
    -- Auto-complete if all sessions used
    IF NEW.sessions_remaining = 0 AND NEW.status = 'active' THEN
        NEW.status = 'completed';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger on pt_subscriptions table
DROP TRIGGER IF EXISTS trigger_check_pt_subscription_status ON pt_subscriptions;
CREATE TRIGGER trigger_check_pt_subscription_status
    BEFORE INSERT OR UPDATE ON pt_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION check_pt_subscription_status();

-- Run the update function once to catch any existing expired subscriptions
SELECT update_pt_subscription_status();

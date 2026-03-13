    -- Add metadata columns to messages to track call details for premium UI
    ALTER TABLE public.messages 
    ADD COLUMN IF NOT EXISTS call_type text,
    ADD COLUMN IF NOT EXISTS caller_id uuid;

    COMMENT ON COLUMN public.messages.call_type IS 'To distinguish between audio and video calls in history';
    COMMENT ON COLUMN public.messages.caller_id IS 'The ID of the person who initiated the call';

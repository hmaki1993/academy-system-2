-- 🛡️ ELITE PWA RELAY SYSTEM (V13)
-- This table acts as a bridge for devices that are blocked from direct Edge Function invocation.

CREATE TABLE IF NOT EXISTS public.push_relay_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    url TEXT DEFAULT '/app',
    status TEXT DEFAULT 'pending', -- pending, sent, failed
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.push_relay_queue ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own relay requests
CREATE POLICY "Users can insert their own push relays"
ON public.push_relay_queue FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own relay status
CREATE POLICY "Users can view their own push relays"
ON public.push_relay_queue FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 🚀 BACKEND TRIGGER: This will be linked to a webhook in the Supabase Dashboard
-- For now, we will use this table to verify client-side communication success.

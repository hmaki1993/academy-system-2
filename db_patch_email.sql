-- Copy and Run this in your Supabase SQL Editor
-- This adds the 'email' column to your consultation requests table
ALTER TABLE public.consultation_requests 
ADD COLUMN IF NOT EXISTS email TEXT;

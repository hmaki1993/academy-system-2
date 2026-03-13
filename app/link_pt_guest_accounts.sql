-- =========================================================================
-- SCRIPT: Link Guest PT Subscriptions to Registered Users
-- PURPOSE: Fixes the issue where PT players created from the dashboard 
--          (without an account initially) are not linked to their newly 
--          registered accounts, causing "No Data" on their dashboards.
-- =========================================================================

-- 1. Link by Email first (most accurate)
UPDATE public.pt_subscriptions
SET user_id = profiles.id
FROM public.profiles
WHERE pt_subscriptions.user_id IS NULL
  AND LOWER(pt_subscriptions.student_email) = LOWER(profiles.email);

-- 2. Link by Name if Email didn't match
UPDATE public.pt_subscriptions
SET user_id = profiles.id
FROM public.profiles
WHERE pt_subscriptions.user_id IS NULL
  AND LOWER(pt_subscriptions.student_name) = LOWER(profiles.full_name);

-- 3. Update RLS Policy to allow viewing by Email as fallback, to prevent this in the future
DROP POLICY IF EXISTS "Users can view own PT subscriptions" ON public.pt_subscriptions;

CREATE POLICY "Users can view own PT subscriptions"
ON public.pt_subscriptions FOR SELECT 
USING (
    auth.uid() = user_id OR
    (auth.jwt() ->> 'email') = student_email
);

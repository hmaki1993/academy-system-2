-- Add user_id column to pt_subscriptions to link to auth.users
ALTER TABLE public.pt_subscriptions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update RLS for pt_subscriptions to allow students to see their own
DROP POLICY IF EXISTS "Users can view own PT subscriptions" ON public.pt_subscriptions;
CREATE POLICY "Users can view own PT subscriptions" 
ON public.pt_subscriptions FOR SELECT 
TO authenticated 
USING (
    user_id = auth.uid() 
    OR (SELECT role::TEXT FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'head_coach', 'coach', 'reception')
);

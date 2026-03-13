-- ============================================================================
-- FIX PAYMENTS TABLE
-- ============================================================================

DO $$
BEGIN
    -- 1. Force Reset: Drop table to ensure we get the fresh schema
    DROP TABLE IF EXISTS public.payments CASCADE;

    -- 2. Create the table
    CREATE TABLE public.payments (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        student_id UUID REFERENCES public.students(id) ON DELETE CASCADE, -- Nullable for Guests
        amount DECIMAL(10, 2) NOT NULL,
        payment_method TEXT NOT NULL,
        payment_date DATE DEFAULT CURRENT_DATE,
        notes TEXT,
        created_by UUID REFERENCES auth.users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- 3. Enable RLS
    ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

    -- 4. Create Policies
    -- Drop existing policies if any
    DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.payments;
    DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.payments;
    DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.payments;

    -- Allow all authenticated users to view payments
    CREATE POLICY "Enable read access for authenticated users" 
    ON public.payments FOR SELECT 
    TO authenticated 
    USING (true);

    -- Allow all authenticated users to insert payments
    CREATE POLICY "Enable insert access for authenticated users" 
    ON public.payments FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

    -- Allow all authenticated users to delete payments
    CREATE POLICY "Enable delete access for authenticated users" 
    ON public.payments FOR DELETE 
    TO authenticated 
    USING (true);

    -- 5. Grant Permissions
    GRANT ALL ON public.payments TO postgres;
    GRANT ALL ON public.payments TO anon;
    GRANT ALL ON public.payments TO authenticated;
    GRANT ALL ON public.payments TO service_role;

    RAISE NOTICE '✅ Table "payments" recreated successfully with RLS policies.';
END $$;

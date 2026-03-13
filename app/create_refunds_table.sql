-- ============================================================================
-- CREATE REFUNDS TABLE
-- ============================================================================

DO $$
BEGIN
    -- 1. Force Reset: Drop table to ensure we get the fresh schema with 'created_by'
    DROP TABLE IF EXISTS public.refunds CASCADE;

    -- 2. Create the table
    CREATE TABLE public.refunds (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        reason TEXT,
        refund_date DATE DEFAULT CURRENT_DATE,
        created_by UUID REFERENCES auth.users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- 2. Enable RLS
    ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

    -- 3. Create Policies
    -- Drop existing policies if any to avoid errors on rerun
    DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.refunds;
    DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.refunds;
    DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.refunds;

    -- Allow all authenticated users to view refunds
    CREATE POLICY "Enable read access for authenticated users" 
    ON public.refunds FOR SELECT 
    TO authenticated 
    USING (true);

    -- Allow all authenticated users to insert refunds
    CREATE POLICY "Enable insert access for authenticated users" 
    ON public.refunds FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

    -- Allow all authenticated users to delete refunds
    CREATE POLICY "Enable delete access for authenticated users" 
    ON public.refunds FOR DELETE 
    TO authenticated 
    USING (true);

    -- 4. Grant Permissions
    GRANT ALL ON public.refunds TO postgres;
    GRANT ALL ON public.refunds TO anon;
    GRANT ALL ON public.refunds TO authenticated;
    GRANT ALL ON public.refunds TO service_role;

    RAISE NOTICE '✅ Table "refunds" created successfully with RLS policies.';
END $$;

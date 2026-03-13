-- ============================================================================
-- CREATE EXPENSES TABLE
-- ============================================================================

DO $$
BEGIN
    -- 1. Force Reset: Drop table to ensure we get the fresh schema with 'created_by'
    DROP TABLE IF EXISTS public.expenses CASCADE;

    -- 2. Create the table
    CREATE TABLE public.expenses (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        description TEXT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        category TEXT NOT NULL CHECK (category IN ('rent', 'equipment', 'utilities', 'salaries', 'other')),
        expense_date DATE DEFAULT CURRENT_DATE,
        created_by UUID REFERENCES auth.users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- 3. Enable RLS
    ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

    -- 4. Create Policies
    -- Drop existing policies if any
    DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.expenses;
    DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.expenses;
    DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.expenses;

    -- Allow all authenticated users to view expenses
    CREATE POLICY "Enable read access for authenticated users" 
    ON public.expenses FOR SELECT 
    TO authenticated 
    USING (true);

    -- Allow all authenticated users to insert expenses
    CREATE POLICY "Enable insert access for authenticated users" 
    ON public.expenses FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

    -- Allow all authenticated users to delete expenses
    CREATE POLICY "Enable delete access for authenticated users" 
    ON public.expenses FOR DELETE 
    TO authenticated 
    USING (true);

    -- 5. Grant Permissions
    GRANT ALL ON public.expenses TO postgres;
    GRANT ALL ON public.expenses TO anon;
    GRANT ALL ON public.expenses TO authenticated;
    GRANT ALL ON public.expenses TO service_role;

    RAISE NOTICE '✅ Table "expenses" created successfully with RLS policies.';
END $$;

-- Create finance_history table for recycle bin functionality
CREATE TABLE IF NOT EXISTS public.finance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    row_id UUID NOT NULL,
    row_data JSONB NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('DELETE', 'UPDATE')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_finance_history_table_name ON public.finance_history(table_name);
CREATE INDEX IF NOT EXISTS idx_finance_history_created_at ON public.finance_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_history_created_by ON public.finance_history(created_by);

-- Enable RLS
ALTER TABLE public.finance_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Check public.profiles for role = 'admin' instead of public.users

CREATE POLICY "Allow admins to view finance history"
    ON public.finance_history
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Allow admins to insert finance history"
    ON public.finance_history
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Grant permissions
GRANT SELECT, INSERT ON public.finance_history TO authenticated;

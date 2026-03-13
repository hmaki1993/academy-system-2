-- ============================================================================
-- FIX STUDENT DELETION RLS POLICY
-- ============================================================================
-- Issue Identified: The 'students' table has RLS enabled but NO policy for DELETE.
-- Result: Even with CASCADE fixed, RLS blocks the delete operation.
-- Solution: Add a policy to allow authenticated users (or admins) to delete students.
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '=== Adding DELETE Policy for Students ===';
    
    -- Check if policy already exists to avoid error
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'students' 
        AND policyname = 'Authenticated users can delete students'
    ) THEN
        EXECUTE 'CREATE POLICY "Authenticated users can delete students" 
                 ON public.students
                 FOR DELETE 
                 TO authenticated
                 USING (true)'; 
                 -- NOTE: USING (true) allows any authenticated user to delete.
                 -- In a production strict env, you might want: 
                 -- USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN (''admin'', ''head_coach'')))
                 -- But based on your current policies ("Authenticated users can insert..."), 
                 -- we will match that permissive level for now to fix the blocker.
        
        RAISE NOTICE 'Created policy: Authenticated users can delete students';
    ELSE
        RAISE NOTICE 'Policy already exists: Authenticated users can delete students';
    END IF;

    -- Just in case, grant delete permission if not already granted (though RLS usually handles this)
    GRANT DELETE ON public.students TO authenticated;
    GRANT DELETE ON public.students TO service_role;
    
END $$;

-- Verify the policies again
SELECT 
    policyname,
    cmd as operation,
    roles
FROM pg_policies
WHERE tablename = 'students';

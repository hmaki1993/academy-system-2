-- ============================================================
-- FIX: Legacy Function Compatibility Layer
-- Resolves 500 Errors on Dashboard by restoring get_user_role
-- ============================================================

-- Restore compatibility for legacy RLS policies
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid DEFAULT auth.uid())
RETURNS text AS $$
BEGIN
  RETURN (SELECT role::text FROM public.profiles WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure get_auth_role is also robust and matching
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text AS $$
BEGIN
  RETURN (SELECT role::text FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_auth_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_role() TO service_role;

COMMENT ON FUNCTION public.get_user_role IS 'Compatibility alias for role-based RLS policies.';

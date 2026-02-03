-- Create a SECURITY DEFINER function to safely get the current user's email
-- This avoids RLS permission issues when accessing auth.users

CREATE OR REPLACE FUNCTION public.get_auth_user_email()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_auth_user_email() TO authenticated;

-- Drop existing policies
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles can be updated by authorized users" ON public.profiles;

-- Recreate SELECT policy using the helper function
CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        -- Super admins can see all profiles
        public.is_super_admin()
        -- Admins can see profiles in their congregation
        OR (public.has_role(auth.uid(), 'admin') AND congregation_id = public.get_current_congregation_id())
        -- Users can see profiles in their congregation
        OR congregation_id = public.get_current_congregation_id()
        -- Users can see their own profile
        OR user_id = auth.uid()
        -- CRITICAL: Users can see profiles with their email (for re-linking)
        OR LOWER(email) = LOWER(public.get_auth_user_email())
    );

-- Recreate UPDATE policy using the helper function
CREATE POLICY "Profiles can be updated by authorized users"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (
        -- Users can update their own profile
        user_id = auth.uid()
        -- CRITICAL: Users can update profiles with their email (for re-linking)
        OR LOWER(email) = LOWER(public.get_auth_user_email())
        -- Super admins can update all profiles
        OR public.is_super_admin()
        -- Admins can update profiles in their congregation
        OR (public.has_role(auth.uid(), 'admin') AND congregation_id = public.get_current_congregation_id())
    )
    WITH CHECK (
        user_id = auth.uid()
        OR LOWER(email) = LOWER(public.get_auth_user_email())
        OR public.is_super_admin()
        OR (public.has_role(auth.uid(), 'admin') AND congregation_id = public.get_current_congregation_id())
    );

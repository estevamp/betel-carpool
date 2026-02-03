-- Update helper function to get current user's email from JWT claims
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT auth.jwt() ->> 'email' INTO user_email;
  RETURN user_email;
END;
$$;

-- Drop existing profiles policies (if they exist from previous migrations)
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles can be updated by authorized users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles can be inserted by super admins" ON public.profiles;
DROP POLICY IF EXISTS "Profiles can be deleted by super admins" ON public.profiles;

-- Recreate SELECT policy with proper email function
CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        public.is_super_admin()
        OR congregation_id = public.get_current_congregation_id()
        OR (user_id IS NULL AND LOWER(email) = LOWER(public.get_current_user_email()))
        OR user_id = auth.uid()
    );

-- Recreate UPDATE policy with proper email function
CREATE POLICY "Profiles can be updated by authorized users"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid()
        OR (user_id IS NULL AND LOWER(email) = LOWER(public.get_current_user_email()))
        OR public.is_super_admin()
        OR (public.has_role(auth.uid(), 'admin') AND congregation_id = public.get_current_congregation_id())
    )
    WITH CHECK (
        user_id = auth.uid()
        OR (user_id IS NULL AND LOWER(email) = LOWER(public.get_current_user_email()))
        OR public.is_super_admin()
        OR (public.has_role(auth.uid(), 'admin') AND congregation_id = public.get_current_congregation_id())
    );

-- Recreate INSERT policy
CREATE POLICY "Profiles can be inserted by super admins"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR public.has_role(auth.uid(), 'admin')
    );

-- Recreate DELETE policy
CREATE POLICY "Profiles can be deleted by super admins"
    ON public.profiles FOR DELETE
    TO authenticated
    USING (public.is_super_admin());

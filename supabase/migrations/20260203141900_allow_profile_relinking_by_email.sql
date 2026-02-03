-- Add ability for users to see and update profiles with their email for re-linking
-- This is critical for the profile linking workflow

-- Drop existing SELECT and UPDATE policies
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles can be updated by authorized users" ON public.profiles;

-- Create SELECT policy that allows viewing profiles by email for re-linking
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
        OR LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
    );

-- Create UPDATE policy that allows re-linking profiles by email
CREATE POLICY "Profiles can be updated by authorized users"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (
        -- Users can update their own profile
        user_id = auth.uid()
        -- CRITICAL: Users can update profiles with their email (for re-linking)
        OR LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
        -- Super admins can update all profiles
        OR public.is_super_admin()
        -- Admins can update profiles in their congregation
        OR (public.has_role(auth.uid(), 'admin') AND congregation_id = public.get_current_congregation_id())
    )
    WITH CHECK (
        user_id = auth.uid()
        OR LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
        OR public.is_super_admin()
        OR (public.has_role(auth.uid(), 'admin') AND congregation_id = public.get_current_congregation_id())
    );

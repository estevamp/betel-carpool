-- Fix RLS policies to allow proper querying of profiles
-- The issue is that the subquery to auth.users in RLS is causing performance issues
-- and blocking legitimate queries

-- Drop existing profiles policies
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles can be updated by authorized users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles can be inserted by super admins" ON public.profiles;
DROP POLICY IF EXISTS "Profiles can be deleted by super admins" ON public.profiles;

-- Create a simpler, more performant SELECT policy
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
    );

-- Create UPDATE policy
CREATE POLICY "Profiles can be updated by authorized users"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (
        -- Users can update their own profile
        user_id = auth.uid()
        -- Super admins can update all profiles
        OR public.is_super_admin()
        -- Admins can update profiles in their congregation
        OR (public.has_role(auth.uid(), 'admin') AND congregation_id = public.get_current_congregation_id())
    )
    WITH CHECK (
        user_id = auth.uid()
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

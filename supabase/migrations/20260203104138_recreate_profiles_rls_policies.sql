-- ============================================
-- RECREATE PROFILES RLS POLICIES
-- ============================================

-- Drop all existing RLS policies for profiles to ensure a clean slate
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile or link existing profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update congregation profiles" ON public.profiles;

-- Recreate SELECT policy: Allow authenticated users to view profiles based on congregation, super-admin status, or if unlinked and email matches
CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        public.is_super_admin()
        OR congregation_id = public.get_current_congregation_id()
        OR (user_id IS NULL AND email = auth.email())
    );

-- Recreate INSERT policy: Allow authenticated users to insert their own profile (only if user_id is auth.uid())
-- This policy is for cases where a user might create their own profile, but the application flow should prevent this if profiles are pre-created by admins.
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Recreate a single, comprehensive UPDATE policy for profiles
CREATE POLICY "Users and Admins can update profiles"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid() -- Users can update their own profile
        OR (user_id IS NULL AND email = auth.email()) -- Users can link an existing profile by email
        OR public.is_super_admin() -- Super-admins can update any profile
        OR (
            public.has_role(auth.uid(), 'admin') -- Regular admins can update profiles in their congregation
            AND congregation_id = public.get_current_congregation_id()
        )
    );

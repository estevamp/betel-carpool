-- ============================================
-- ADD HELPER FUNCTIONS FOR CONGREGATION ACCESS
-- ============================================
-- This migration adds helper functions to check congregation access

-- Function to get current user's congregation_id
CREATE OR REPLACE FUNCTION public.get_current_congregation_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT congregation_id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(auth.uid(), 'super_admin')
$$;

-- Function to check if user is congregation admin for a specific congregation
CREATE OR REPLACE FUNCTION public.is_congregation_admin(_congregation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.congregation_administrators ca
        WHERE ca.profile_id = public.get_current_profile_id()
        AND ca.congregation_id = _congregation_id
    )
$$;

-- Function to check if user can access a congregation's data
-- Returns true if:
-- 1. User is super admin
-- 2. User belongs to the congregation
-- 3. User is an admin of the congregation
CREATE OR REPLACE FUNCTION public.can_access_congregation(_congregation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT (
        public.is_super_admin()
        OR public.get_current_congregation_id() = _congregation_id
        OR public.is_congregation_admin(_congregation_id)
    )
$$;

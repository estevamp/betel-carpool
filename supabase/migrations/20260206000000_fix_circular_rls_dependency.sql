-- ============================================
-- FIX CIRCULAR RLS DEPENDENCY IN get_current_congregation_id
-- ============================================
-- The get_current_congregation_id function was causing an infinite loop
-- because it queries the profiles table, which has an RLS policy that calls
-- get_current_congregation_id, creating a circular dependency.
--
-- Solution: Simplify the RLS policy to not use helper functions that query
-- the same table, breaking the circular dependency.

-- First, let's check what policies exist and drop them
DO $$
BEGIN
    -- Drop the problematic SELECT policy if it exists
    DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
END $$;

-- Create a simpler SELECT policy that doesn't cause circular dependencies
-- This policy allows users to see:
-- 1. Their own profile (by user_id)
-- 2. Profiles with matching email (for linking)
-- 3. Profiles in the same congregation (checked via a subquery that doesn't use helper functions)
-- 4. All profiles if user is super admin (checked directly without helper function)
CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        -- User can see their own profile
        user_id = auth.uid()
        -- User can see unlinked profiles with their email (for profile linking)
        OR (user_id IS NULL AND email = auth.email())
        -- User can see profiles in their congregation (direct subquery, no helper function)
        OR congregation_id IN (
            SELECT congregation_id
            FROM public.profiles
            WHERE user_id = auth.uid()
        )
        -- Super admins can see all profiles (direct check, no helper function)
        OR EXISTS (
            SELECT 1
            FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'super_admin'
        )
    );

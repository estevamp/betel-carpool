-- Fix RLS policy for congregations to ensure super_admins can see all congregations
-- and regular users can see their own congregation.

-- First, ensure we drop the policy if it exists to avoid "already exists" errors
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'congregations' AND policyname = 'Congregations are viewable by authenticated users') THEN
        DROP POLICY "Congregations are viewable by authenticated users" ON public.congregations;
    END IF;
END $$;

-- Re-create the policy using a simpler approach that doesn't depend on custom functions
-- if they are not yet available in the remote database, while still allowing super_admins
-- to see everything via the user_roles table.
CREATE POLICY "Congregations are viewable by authenticated users"
    ON public.congregations FOR SELECT
    TO authenticated
    USING (
        -- Super-admin check via user_roles
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'super_admin'
        )
        -- User belongs to this congregation
        OR id IN (
            SELECT congregation_id FROM public.profiles
            WHERE user_id = auth.uid()
        )
        -- User is an admin of this congregation
        OR id IN (
            SELECT ca.congregation_id FROM public.congregation_administrators ca
            JOIN public.profiles p ON ca.profile_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

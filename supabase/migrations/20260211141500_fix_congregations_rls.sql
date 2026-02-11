-- Fix RLS policy for congregations to ensure super_admins can see all congregations
-- and regular users can see their own congregation.

-- First, ensure we drop the policy if it exists to avoid "already exists" errors
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'congregations' AND policyname = 'Congregations are viewable by authenticated users') THEN
        DROP POLICY "Congregations are viewable by authenticated users" ON public.congregations;
    END IF;
END $$;

CREATE POLICY "Congregations are viewable by authenticated users"
    ON public.congregations FOR SELECT
    TO authenticated
    USING (
        public.is_super_admin()
        OR id = public.get_current_congregation_id()
        OR public.is_congregation_admin(id)
    );

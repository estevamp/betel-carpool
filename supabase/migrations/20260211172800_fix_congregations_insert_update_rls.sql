-- Fix RLS policies for congregations table to allow INSERT, UPDATE, and DELETE operations
-- Only super_admins should be able to create, update, or delete congregations

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Super admins can insert congregations" ON public.congregations;
DROP POLICY IF EXISTS "Super admins can update congregations" ON public.congregations;
DROP POLICY IF EXISTS "Super admins can delete congregations" ON public.congregations;

-- Allow super_admins to insert congregations
CREATE POLICY "Super admins can insert congregations"
    ON public.congregations FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'super_admin'
        )
    );

-- Allow super_admins to update congregations
CREATE POLICY "Super admins can update congregations"
    ON public.congregations FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'super_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'super_admin'
        )
    );

-- Allow super_admins to delete congregations
CREATE POLICY "Super admins can delete congregations"
    ON public.congregations FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'super_admin'
        )
    );

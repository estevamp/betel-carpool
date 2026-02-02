-- ============================================
-- ADD DELETE POLICY FOR PROFILES
-- ============================================
-- This migration adds a DELETE policy for profiles table
-- to allow admins and super-admins to delete profiles

CREATE POLICY "Admins can delete congregation profiles"
    ON public.profiles FOR DELETE
    TO authenticated
    USING (
        public.is_super_admin()
        OR (
            public.has_role(auth.uid(), 'admin')
            AND congregation_id = public.get_current_congregation_id()
        )
    );

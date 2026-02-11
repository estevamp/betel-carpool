-- ============================================
-- FIX SETTINGS RLS FOR SUPER_ADMIN
-- ============================================

-- Drop existing policy
DROP POLICY IF EXISTS "Admins can manage settings" ON public.settings;

-- Create new policy that includes super_admin
CREATE POLICY "Admins and super admins can manage settings"
    ON public.settings FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'admin'::public.app_role
        )
        OR public.is_super_admin()
    );

-- Also update FAQ policies while we are at it, as they had the same restriction
DROP POLICY IF EXISTS "Admins can manage FAQ" ON public.faq;

CREATE POLICY "Admins and super admins can manage FAQ"
    ON public.faq FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'admin'::public.app_role
        )
        OR public.is_super_admin()
    );

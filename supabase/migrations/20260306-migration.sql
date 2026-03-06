-- supabase/migrations/20260307000001_fix_transfers_update_rls.sql

DROP POLICY IF EXISTS "Users can update their transfers as paid" ON public.transfers;

CREATE POLICY "Users can update their transfers as paid"
    ON public.transfers FOR UPDATE
    TO authenticated
    USING (
        public.is_super_admin()
        OR (
            (debtor_id = public.get_current_profile_id() OR public.has_role(auth.uid(), 'admin'))
            AND congregation_id = public.get_current_congregation_id()
        )
    )
    WITH CHECK (
        public.is_super_admin()
        OR (
            (debtor_id = public.get_current_profile_id() OR public.has_role(auth.uid(), 'admin'))
            AND congregation_id = public.get_current_congregation_id()
        )
    );
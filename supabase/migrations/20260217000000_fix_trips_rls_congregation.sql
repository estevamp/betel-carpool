-- Fix RLS policy for trips to filter by congregation
-- This ensures users only see trips from their own congregation

DROP POLICY IF EXISTS "Trips are viewable by congregation members" ON public.trips;

CREATE POLICY "Trips are viewable by congregation members"
    ON public.trips FOR SELECT
    TO authenticated
    USING (
        public.is_super_admin()
        OR congregation_id = public.get_current_congregation_id()
    );

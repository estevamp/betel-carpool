-- Allow admins to delete any trip within their congregation
DROP POLICY IF EXISTS "Drivers can delete their own trips" ON public.trips;

CREATE POLICY "Drivers and admins can delete trips"
    ON public.trips FOR DELETE
    TO authenticated
    USING (
        (
            driver_id = public.get_current_profile_id() 
            OR public.has_role(auth.uid(), 'admin')
            OR public.is_super_admin()
        )
        AND (
            public.is_super_admin()
            OR congregation_id = public.get_current_congregation_id()
        )
    );

-- Also update UPDATE policy to ensure admins can edit any trip in their congregation if needed
DROP POLICY IF EXISTS "Drivers can update their own trips" ON public.trips;

CREATE POLICY "Drivers and admins can update trips"
    ON public.trips FOR UPDATE
    TO authenticated
    USING (
        (
            driver_id = public.get_current_profile_id() 
            OR public.has_role(auth.uid(), 'admin')
            OR public.is_super_admin()
        )
        AND (
            public.is_super_admin()
            OR congregation_id = public.get_current_congregation_id()
        )
    );

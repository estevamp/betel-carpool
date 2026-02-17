-- Migration to allow Admins and Super-admins to create records on behalf of others
-- and ensure they can only do so for users within their congregation (or any for super-admins)

-- 1. Update TRIPS policies
DROP POLICY IF EXISTS "Drivers can create trips" ON public.trips;
CREATE POLICY "Drivers can create trips"
    ON public.trips FOR INSERT
    TO authenticated
    WITH CHECK (
        (
            -- User is creating for themselves
            driver_id = public.get_current_profile_id()
            OR 
            -- User is an admin creating for someone else in the same congregation
            (
                public.has_role(auth.uid(), 'admin') 
                AND EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = trips.driver_id
                    AND p.congregation_id = public.get_current_congregation_id()
                )
            )
            OR
            -- User is a super-admin
            public.is_super_admin()
        )
        AND (
            public.is_super_admin()
            OR congregation_id = public.get_current_congregation_id()
        )
    );

-- 2. Update ABSENCES policies
DROP POLICY IF EXISTS "Users can manage their own absences" ON public.absences;
CREATE POLICY "Users can manage their own absences"
    ON public.absences FOR ALL
    TO authenticated
    USING (
        (profile_id = public.get_current_profile_id() OR public.has_role(auth.uid(), 'admin') OR public.is_super_admin())
        AND (
            public.is_super_admin()
            OR congregation_id = public.get_current_congregation_id()
        )
    )
    WITH CHECK (
        (
            profile_id = public.get_current_profile_id() 
            OR 
            (
                public.has_role(auth.uid(), 'admin')
                AND EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = absences.profile_id
                    AND p.congregation_id = public.get_current_congregation_id()
                )
            )
            OR public.is_super_admin()
        )
        AND (
            public.is_super_admin()
            OR congregation_id = public.get_current_congregation_id()
        )
    );

-- 3. Update RIDE REQUESTS policies
DROP POLICY IF EXISTS "Users can manage their own ride requests" ON public.ride_requests;
CREATE POLICY "Users can manage their own ride requests"
    ON public.ride_requests FOR ALL
    TO authenticated
    USING (
        (profile_id = public.get_current_profile_id() OR public.has_role(auth.uid(), 'admin') OR public.is_super_admin())
        AND (
            public.is_super_admin()
            OR congregation_id = public.get_current_congregation_id()
        )
    )
    WITH CHECK (
        (
            profile_id = public.get_current_profile_id() 
            OR 
            (
                public.has_role(auth.uid(), 'admin')
                AND EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = ride_requests.profile_id
                    AND p.congregation_id = public.get_current_congregation_id()
                )
            )
            OR public.is_super_admin()
        )
        AND (
            public.is_super_admin()
            OR congregation_id = public.get_current_congregation_id()
        )
    );

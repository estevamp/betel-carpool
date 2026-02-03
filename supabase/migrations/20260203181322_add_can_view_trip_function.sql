-- Add can_view_trip function
CREATE OR REPLACE FUNCTION public.can_view_trip(trip_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.trips t
        LEFT JOIN public.congregation_administrators ca ON t.congregation_id = ca.congregation_id AND ca.profile_id = public.get_profile_id_from_user_id(auth.uid())
        WHERE t.id = trip_id
        AND (
            public.is_super_admin()
            OR t.driver_id = public.get_profile_id_from_user_id(auth.uid())
            OR EXISTS (
                SELECT 1
                FROM public.trip_passengers tp
                WHERE tp.trip_id = t.id AND tp.passenger_id = public.get_profile_id_from_user_id(auth.uid())
            )
            OR (t.congregation_id = public.get_current_congregation_id() AND auth.role() = 'authenticated')
        )
    );
END;
$$;

-- Recreate RLS policy for trips to use can_view_trip
DROP POLICY IF EXISTS "Trips are viewable by authenticated users" ON public.trips;
CREATE POLICY "Trips are viewable by authenticated users"
    ON public.trips FOR SELECT
    TO authenticated
    USING (public.can_view_trip(id));

-- Recreate RLS policy for trip_passengers to use can_view_trip
DROP POLICY IF EXISTS "Trip passengers are viewable by authenticated users" ON public.trip_passengers;
CREATE POLICY "Trip passengers are viewable by authenticated users"
    ON public.trip_passengers FOR SELECT
    TO authenticated
    USING (public.can_view_trip(trip_id));

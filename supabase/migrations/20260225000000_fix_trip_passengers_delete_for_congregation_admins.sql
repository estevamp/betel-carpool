-- Fix DELETE policy for trip_passengers to include congregation admins
-- This allows congregation admins to remove passengers from trips in their congregation

DROP POLICY IF EXISTS "Users or drivers can remove passengers" ON public.trip_passengers;

CREATE POLICY "Users or drivers can remove passengers"
ON public.trip_passengers
FOR DELETE
USING (
  -- User can remove themselves
  passenger_id = get_current_profile_id() 
  -- OR driver can remove anyone from their trip
  OR EXISTS (
    SELECT 1 FROM public.trips 
    WHERE id = trip_id 
    AND driver_id = get_current_profile_id()
  )
  -- OR super-admin can do anything
  OR public.is_super_admin()
  -- OR congregation admin can remove passengers from trips in their congregation
  OR EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_id
    AND public.is_congregation_admin(t.congregation_id)
  )
  -- OR legacy admin role (for backwards compatibility)
  OR has_role(auth.uid(), 'admin'::app_role)
);

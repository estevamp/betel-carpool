-- ============================================
-- UPDATE DELETE POLICY FOR TRIP PASSENGERS
-- ============================================
-- Allow any authenticated user to remove any passenger from a trip

-- Drop existing delete policy
DROP POLICY IF EXISTS "Users or drivers can remove passengers" ON public.trip_passengers;

-- Create new policy that allows any authenticated user to remove passengers
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
  -- OR any authenticated user can remove any passenger
  OR (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.trips 
      WHERE id = trip_id 
      AND is_active = true
    )
  )
  -- OR admin can do anything
  OR has_role(auth.uid(), 'admin'::app_role)
);

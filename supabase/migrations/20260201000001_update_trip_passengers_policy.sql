-- ============================================
-- UPDATE TRIP PASSENGERS POLICY
-- ============================================
-- Allow any authenticated user to add any passenger to a trip
-- This enables users to reserve spots for others or visitors

-- Drop existing policy
DROP POLICY IF EXISTS "Users or drivers can add passengers" ON public.trip_passengers;

-- Create new policy that allows any authenticated user to add passengers
CREATE POLICY "Users or drivers can add passengers"
ON public.trip_passengers
FOR INSERT
WITH CHECK (
  -- User can add themselves
  passenger_id = get_current_profile_id() 
  -- OR driver can add anyone to their trip
  OR EXISTS (
    SELECT 1 FROM public.trips 
    WHERE id = trip_id 
    AND driver_id = get_current_profile_id()
  )
  -- OR any authenticated user can add any passenger (including visitors)
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

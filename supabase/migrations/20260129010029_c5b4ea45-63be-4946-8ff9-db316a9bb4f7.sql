-- Drop existing policies and create new ones that allow drivers to manage passengers
DROP POLICY IF EXISTS "Users can add themselves as passengers" ON public.trip_passengers;
DROP POLICY IF EXISTS "Users can remove themselves as passengers" ON public.trip_passengers;

-- Policy: Users can add themselves as passengers OR drivers can add anyone
CREATE POLICY "Users or drivers can add passengers"
ON public.trip_passengers
FOR INSERT
WITH CHECK (
  passenger_id = get_current_profile_id() 
  OR EXISTS (
    SELECT 1 FROM public.trips 
    WHERE id = trip_id 
    AND driver_id = get_current_profile_id()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Users can remove themselves OR drivers can remove anyone from their trip
CREATE POLICY "Users or drivers can remove passengers"
ON public.trip_passengers
FOR DELETE
USING (
  passenger_id = get_current_profile_id() 
  OR EXISTS (
    SELECT 1 FROM public.trips 
    WHERE id = trip_id 
    AND driver_id = get_current_profile_id()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);
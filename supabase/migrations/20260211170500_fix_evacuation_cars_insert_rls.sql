
-- Fix RLS policy for evacuation_cars to allow insertion when congregation_id is not yet set (it will be set by trigger)
-- or when it matches the user's congregation.

DROP POLICY IF EXISTS "Drivers can insert their evacuation cars" ON public.evacuation_cars;

CREATE POLICY "Drivers can insert their evacuation cars"
ON public.evacuation_cars
FOR INSERT
TO authenticated
WITH CHECK (
  (driver_id = get_current_profile_id() OR has_role(auth.uid(), 'admin'::app_role))
  AND (
    is_super_admin() 
    OR congregation_id IS NULL 
    OR congregation_id = get_current_congregation_id()
  )
);

-- Also ensure UPDATE and DELETE policies are robust
DROP POLICY IF EXISTS "Drivers can update their evacuation cars" ON public.evacuation_cars;
CREATE POLICY "Drivers can update their evacuation cars"
ON public.evacuation_cars
FOR UPDATE
TO authenticated
USING (
  (driver_id = get_current_profile_id() OR has_role(auth.uid(), 'admin'::app_role))
  AND (is_super_admin() OR congregation_id = get_current_congregation_id())
);

DROP POLICY IF EXISTS "Drivers can delete their evacuation cars" ON public.evacuation_cars;
CREATE POLICY "Drivers can delete their evacuation cars"
ON public.evacuation_cars
FOR DELETE
TO authenticated
USING (
  (driver_id = get_current_profile_id() OR has_role(auth.uid(), 'admin'::app_role))
  AND (is_super_admin() OR congregation_id = get_current_congregation_id())
);

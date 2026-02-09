
-- Drop the overly restrictive ALL policy that blocks regular users from viewing
DROP POLICY IF EXISTS "Drivers can manage their evacuation cars" ON public.evacuation_cars;

-- Create separate policies for INSERT, UPDATE, DELETE (not SELECT)
CREATE POLICY "Drivers can insert their evacuation cars"
ON public.evacuation_cars
FOR INSERT
WITH CHECK (
  (driver_id = get_current_profile_id() OR has_role(auth.uid(), 'admin'::app_role))
  AND (is_super_admin() OR (congregation_id = get_current_congregation_id()))
);

CREATE POLICY "Drivers can update their evacuation cars"
ON public.evacuation_cars
FOR UPDATE
USING (
  (driver_id = get_current_profile_id() OR has_role(auth.uid(), 'admin'::app_role))
  AND (is_super_admin() OR (congregation_id = get_current_congregation_id()))
);

CREATE POLICY "Drivers can delete their evacuation cars"
ON public.evacuation_cars
FOR DELETE
USING (
  (driver_id = get_current_profile_id() OR has_role(auth.uid(), 'admin'::app_role))
  AND (is_super_admin() OR (congregation_id = get_current_congregation_id()))
);


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

-- Fix RLS policy for evacuation_passengers to allow congregation members to add themselves
DROP POLICY IF EXISTS "Congregation members can add passengers to evacuation cars" ON public.evacuation_passengers;

CREATE POLICY "Congregation members can add passengers to evacuation cars"
ON public.evacuation_passengers
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    -- User is adding themselves
    passenger_id = get_current_profile_id()
    AND EXISTS (
      SELECT 1 FROM public.evacuation_cars ec
      WHERE ec.id = evacuation_car_id
      AND (ec.congregation_id = get_current_congregation_id() OR is_super_admin())
    )
  )
  OR (
    -- Driver is adding someone to their own car
    EXISTS (
      SELECT 1 FROM public.evacuation_cars ec
      WHERE ec.id = evacuation_car_id
      AND ec.driver_id = get_current_profile_id()
    )
  )
);

-- Fix DELETE policy for passengers as well
DROP POLICY IF EXISTS "Congregation members can remove passengers from evacuation cars" ON public.evacuation_passengers;

CREATE POLICY "Congregation members can remove passengers from evacuation cars"
ON public.evacuation_passengers
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR passenger_id = get_current_profile_id()
  OR EXISTS (
    SELECT 1 FROM public.evacuation_cars ec
    WHERE ec.id = evacuation_car_id
    AND (ec.driver_id = get_current_profile_id() OR is_super_admin())
  )
);

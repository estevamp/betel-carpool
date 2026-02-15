-- Fix evacuation management permissions for congregation admins and super-admins
-- Also keeps drivers able to manage their own evacuation cars/passengers.

DROP POLICY IF EXISTS "Drivers can manage their evacuation cars" ON public.evacuation_cars;

CREATE POLICY "Drivers can manage their evacuation cars"
ON public.evacuation_cars
FOR ALL
TO authenticated
USING (
  driver_id = public.get_current_profile_id()
  OR public.is_super_admin()
  OR public.has_role(auth.uid(), 'admin')
  OR public.is_congregation_admin(congregation_id)
)
WITH CHECK (
  driver_id = public.get_current_profile_id()
  OR public.is_super_admin()
  OR public.has_role(auth.uid(), 'admin')
  OR public.is_congregation_admin(congregation_id)
);

DROP POLICY IF EXISTS "Admins can manage evacuation passengers" ON public.evacuation_passengers;
DROP POLICY IF EXISTS "Drivers can add passengers to their cars" ON public.evacuation_passengers;
DROP POLICY IF EXISTS "Drivers can remove passengers from their cars" ON public.evacuation_passengers;

CREATE POLICY "Admins can manage evacuation passengers"
ON public.evacuation_passengers
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1
    FROM public.evacuation_cars ec
    WHERE ec.id = evacuation_passengers.evacuation_car_id
      AND public.is_congregation_admin(ec.congregation_id)
  )
)
WITH CHECK (
  public.is_super_admin()
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1
    FROM public.evacuation_cars ec
    WHERE ec.id = evacuation_passengers.evacuation_car_id
      AND public.is_congregation_admin(ec.congregation_id)
  )
);

CREATE POLICY "Drivers can add passengers to their cars"
ON public.evacuation_passengers
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.evacuation_cars ec
    WHERE ec.id = evacuation_passengers.evacuation_car_id
      AND ec.driver_id = public.get_current_profile_id()
  )
);

CREATE POLICY "Drivers can remove passengers from their cars"
ON public.evacuation_passengers
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.evacuation_cars ec
    WHERE ec.id = evacuation_passengers.evacuation_car_id
      AND ec.driver_id = public.get_current_profile_id()
  )
);

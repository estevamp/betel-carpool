
-- Drop existing restrictive INSERT policy for passengers
DROP POLICY IF EXISTS "Drivers can add passengers to their cars" ON public.evacuation_passengers;

-- Allow any congregation member to add passengers to cars in their congregation
CREATE POLICY "Congregation members can add passengers to evacuation cars"
ON public.evacuation_passengers
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM evacuation_cars
    WHERE evacuation_cars.id = evacuation_passengers.evacuation_car_id
    AND (evacuation_cars.congregation_id = get_current_congregation_id() OR is_super_admin())
  )
);

-- Also allow any congregation member to remove passengers
DROP POLICY IF EXISTS "Drivers can remove passengers from their cars" ON public.evacuation_passengers;

CREATE POLICY "Congregation members can remove passengers from evacuation cars"
ON public.evacuation_passengers
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM evacuation_cars
    WHERE evacuation_cars.id = evacuation_passengers.evacuation_car_id
    AND (evacuation_cars.congregation_id = get_current_congregation_id() OR is_super_admin())
  )
);

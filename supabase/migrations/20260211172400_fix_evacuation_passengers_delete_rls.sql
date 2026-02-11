-- Fix RLS policies for evacuation_passengers to allow proper deletion

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage evacuation passengers" ON public.evacuation_passengers;
DROP POLICY IF EXISTS "Congregation members can add passengers to evacuation cars" ON public.evacuation_passengers;
DROP POLICY IF EXISTS "Congregation members can remove passengers from evacuation cars" ON public.evacuation_passengers;

-- SELECT policy: All authenticated users can view passengers
CREATE POLICY "Evacuation passengers are viewable by authenticated users"
ON public.evacuation_passengers
FOR SELECT
TO authenticated
USING (true);

-- INSERT policy: Allow congregation members to add themselves or drivers to add to their cars
CREATE POLICY "Congregation members can add passengers to evacuation cars"
ON public.evacuation_passengers
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_super_admin()
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

-- DELETE policy: Allow users to remove themselves, drivers to remove from their cars, or admins
CREATE POLICY "Congregation members can remove passengers from evacuation cars"
ON public.evacuation_passengers
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_super_admin()
  OR passenger_id = get_current_profile_id()
  OR EXISTS (
    SELECT 1 FROM public.evacuation_cars ec
    WHERE ec.id = evacuation_car_id
    AND ec.driver_id = get_current_profile_id()
  )
);

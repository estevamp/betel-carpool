-- Allow drivers to add passengers to their own evacuation cars
CREATE POLICY "Drivers can add passengers to their cars"
ON public.evacuation_passengers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.evacuation_cars
    WHERE id = evacuation_car_id
    AND driver_id = get_current_profile_id()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Allow drivers to remove passengers from their own evacuation cars
CREATE POLICY "Drivers can remove passengers from their cars"
ON public.evacuation_passengers
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.evacuation_cars
    WHERE id = evacuation_car_id
    AND driver_id = get_current_profile_id()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);
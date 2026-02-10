-- ============================================
-- ALLOW MULTIPLE VISITANTE PASSENGERS
-- ============================================
-- Remove the unique constraint that prevents the same passenger
-- from being added multiple times to the same car

-- Drop the existing unique constraint
ALTER TABLE public.evacuation_passengers 
DROP CONSTRAINT IF EXISTS evacuation_passengers_evacuation_car_id_passenger_id_key;

-- Add a new partial unique constraint that allows multiple Visitante entries
-- but still prevents duplicates for regular passengers
CREATE UNIQUE INDEX evacuation_passengers_unique_regular_idx 
ON public.evacuation_passengers (evacuation_car_id, passenger_id)
WHERE passenger_id != '00000000-0000-0000-0000-000000000001'::uuid;

-- Add a comment explaining the constraint
COMMENT ON INDEX evacuation_passengers_unique_regular_idx IS 
'Prevents duplicate passengers in the same car, except for the special Visitante profile which can be added multiple times';

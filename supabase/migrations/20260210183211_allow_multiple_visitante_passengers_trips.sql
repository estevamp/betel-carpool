-- ============================================
-- ALLOW MULTIPLE VISITANTE PASSENGERS IN TRIPS
-- ============================================
-- Remove the unique constraint that prevents the same passenger
-- from being added multiple times to the same trip

-- Drop the existing unique constraint
ALTER TABLE public.trip_passengers 
DROP CONSTRAINT IF EXISTS trip_passengers_trip_id_passenger_id_key;

-- Add a new partial unique constraint that allows multiple Visitante entries
-- but still prevents duplicates for regular passengers
CREATE UNIQUE INDEX trip_passengers_unique_regular_idx 
ON public.trip_passengers (trip_id, passenger_id)
WHERE passenger_id != '00000000-0000-0000-0000-000000000001'::uuid;

-- Add a comment explaining the constraint
COMMENT ON INDEX trip_passengers_unique_regular_idx IS 
'Prevents duplicate passengers in the same trip, except for the special Visitante profile which can be added multiple times';

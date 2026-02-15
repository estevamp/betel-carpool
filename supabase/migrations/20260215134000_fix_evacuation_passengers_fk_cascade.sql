-- Ensure evacuation_passengers -> evacuation_cars uses ON DELETE CASCADE
-- so deleting a car automatically removes linked passengers.

ALTER TABLE public.evacuation_passengers
DROP CONSTRAINT IF EXISTS evacuation_passengers_evacuation_car_id_fkey;

ALTER TABLE public.evacuation_passengers
ADD CONSTRAINT evacuation_passengers_evacuation_car_id_fkey
FOREIGN KEY (evacuation_car_id)
REFERENCES public.evacuation_cars(id)
ON DELETE CASCADE;

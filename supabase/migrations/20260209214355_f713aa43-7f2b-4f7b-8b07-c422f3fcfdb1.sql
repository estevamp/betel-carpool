-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Trips are viewable by congregation members" ON public.trips;

-- Create a proper SELECT policy that filters by congregation
CREATE POLICY "Trips are viewable by congregation members"
ON public.trips
FOR SELECT
USING (
  is_super_admin()
  OR congregation_id = get_current_congregation_id()
);
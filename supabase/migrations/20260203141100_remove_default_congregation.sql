-- Remove the default congregation logic and fix the NOT NULL constraint
-- The congregation_id should be set by the admin creating the profile, not by a default

-- First, remove the NOT NULL constraint temporarily to allow flexibility
ALTER TABLE public.profiles ALTER COLUMN congregation_id DROP NOT NULL;

-- Drop the default value
ALTER TABLE public.profiles ALTER COLUMN congregation_id DROP DEFAULT;

-- Drop the helper function for default congregation (no longer needed)
DROP FUNCTION IF EXISTS public.get_or_create_default_congregation();

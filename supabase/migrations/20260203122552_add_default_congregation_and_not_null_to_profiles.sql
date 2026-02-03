-- ============================================
-- ADD DEFAULT CONGREGATION AND NOT NULL TO PROFILES
-- ============================================

-- Function to get or create a default congregation
CREATE OR REPLACE FUNCTION public.get_or_create_default_congregation()
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    default_congregation_id UUID;
BEGIN
    -- Try to find an existing default congregation (e.g., named 'Padrão' or 'Default')
    SELECT id INTO default_congregation_id FROM public.congregations WHERE name = 'Padrão' LIMIT 1;

    -- If no default congregation exists, create one
    IF default_congregation_id IS NULL THEN
        INSERT INTO public.congregations (name) VALUES ('Padrão')
        RETURNING id INTO default_congregation_id;
    END IF;

    RETURN default_congregation_id;
END;
$$;

-- Update existing profiles with NULL congregation_id to the default congregation
UPDATE public.profiles
SET congregation_id = public.get_or_create_default_congregation()
WHERE congregation_id IS NULL;

-- Alter profiles table to set congregation_id as NOT NULL
ALTER TABLE public.profiles
ALTER COLUMN congregation_id SET NOT NULL;

-- Add a default value to the congregation_id column for new inserts
ALTER TABLE public.profiles
ALTER COLUMN congregation_id SET DEFAULT public.get_or_create_default_congregation();

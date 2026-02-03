-- Add get_profile_id_from_user_id function
CREATE OR REPLACE FUNCTION public.get_profile_id_from_user_id(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile_id uuid;
BEGIN
    SELECT id INTO profile_id FROM public.profiles WHERE user_id = p_user_id;
    RETURN profile_id;
END;
$$;

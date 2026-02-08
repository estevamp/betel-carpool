-- ============================================
-- ADD RPC FUNCTION TO GET PROFILE WITHOUT RLS
-- ============================================
-- This function bypasses RLS to avoid circular dependencies
-- when fetching the current user's profile

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    full_name TEXT,
    email TEXT,
    sex TEXT,
    is_exempt BOOLEAN,
    pix_key TEXT,
    is_married BOOLEAN,
    is_driver BOOLEAN,
    show_tips BOOLEAN,
    spouse_id UUID,
    congregation_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Return the profile for the current authenticated user
    -- SECURITY DEFINER allows this to bypass RLS
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.full_name,
        p.email,
        p.sex,
        p.is_exempt,
        p.pix_key,
        p.is_married,
        p.is_driver,
        p.show_tips,
        p.spouse_id,
        p.congregation_id
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
    LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- Also create a function to get profile by email for linking
CREATE OR REPLACE FUNCTION public.get_profile_by_email(user_email TEXT)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    full_name TEXT,
    email TEXT,
    sex TEXT,
    is_exempt BOOLEAN,
    pix_key TEXT,
    is_married BOOLEAN,
    is_driver BOOLEAN,
    show_tips BOOLEAN,
    spouse_id UUID,
    congregation_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Return the profile matching the email
    -- SECURITY DEFINER allows this to bypass RLS
    -- Only return if the email matches the current user's email
    IF LOWER(user_email) = LOWER((SELECT auth.email())) THEN
        RETURN QUERY
        SELECT 
            p.id,
            p.user_id,
            p.full_name,
            p.email,
            p.sex,
            p.is_exempt,
            p.pix_key,
            p.is_married,
            p.is_driver,
            p.show_tips,
            p.spouse_id,
            p.congregation_id
        FROM public.profiles p
        WHERE LOWER(p.email) = LOWER(user_email)
        LIMIT 1;
    END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_profile_by_email(TEXT) TO authenticated;

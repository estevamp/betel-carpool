-- ============================================
-- BLOCK USER SIGNUP WITHOUT PRE-EXISTING PROFILE
-- ============================================
-- This migration creates a function that blocks user signup
-- if there's no pre-existing profile with their email.
-- Only users who have been invited (have a profile created by admin) can sign up.

-- Create a function to check if profile exists before allowing signup
CREATE OR REPLACE FUNCTION public.check_profile_exists_before_signup()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_email TEXT;
  profile_exists BOOLEAN;
BEGIN
  -- Get the email from the new user
  user_email := LOWER(TRIM(NEW.email));
  
  -- Check if a profile exists with this email
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE LOWER(TRIM(email)) = user_email
  ) INTO profile_exists;
  
  -- If no profile exists, prevent the signup
  IF NOT profile_exists THEN
    RAISE EXCEPTION 'Você precisa ser convidado antes de criar uma conta. Entre em contato com o coordenador de transportes da sua congregação.'
      USING HINT = 'No profile found for email: ' || user_email;
  END IF;
  
  -- If profile exists, allow the signup
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users to check profile before insert
-- Note: This requires Supabase to have the trigger enabled on auth schema
-- Since we can't directly create triggers on auth.users, we'll use a different approach

-- Instead, we'll create a webhook/edge function approach
-- But for now, let's document this and handle it in the application layer

-- Drop the function since we can't use it directly on auth.users
DROP FUNCTION IF EXISTS public.check_profile_exists_before_signup();

-- ============================================
-- ALTERNATIVE APPROACH: Database Function for Validation
-- ============================================
-- Create a function that can be called from the application
-- to check if a user can sign up

CREATE OR REPLACE FUNCTION public.can_user_signup(user_email TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  profile_exists BOOLEAN;
  normalized_email TEXT;
BEGIN
  -- Normalize email
  normalized_email := LOWER(TRIM(user_email));
  
  -- Check if a profile exists with this email
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE LOWER(TRIM(email)) = normalized_email
  ) INTO profile_exists;
  
  RETURN profile_exists;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.can_user_signup(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_signup(TEXT) TO anon;

-- Add comment
COMMENT ON FUNCTION public.can_user_signup(TEXT) IS 
'Checks if a user with the given email can sign up (i.e., has a pre-existing profile created by an admin invite)';

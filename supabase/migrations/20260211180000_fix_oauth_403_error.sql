-- ============================================
-- FIX OAUTH 403 ERROR ON /auth/v1/user
-- ============================================
-- This migration fixes the 403 error that occurs when users
-- try to log in with Google OAuth. The issue is that RLS policies
-- on profiles table are too restrictive for new OAuth users.

-- The /auth/v1/user endpoint doesn't actually query the profiles table,
-- but we need to ensure that the get_current_user_email() function
-- doesn't fail when called during the auth flow.

-- Update the get_current_user_email function to handle cases where
-- the user doesn't have a profile yet
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Return NULL if no user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Try to get email from JWT first (most reliable for OAuth)
  BEGIN
    SELECT auth.jwt() ->> 'email' INTO user_email;
  EXCEPTION WHEN OTHERS THEN
    user_email := NULL;
  END;
  
  -- If not in JWT, try from auth.users table
  IF user_email IS NULL THEN
    BEGIN
      SELECT email INTO user_email
      FROM auth.users
      WHERE id = auth.uid();
    EXCEPTION WHEN OTHERS THEN
      user_email := NULL;
    END;
  END IF;
  
  RETURN LOWER(user_email);
END;
$$;

-- Update the profiles SELECT policy to be more permissive for authenticated users
-- This allows OAuth users to complete the auth flow even without a profile
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        -- Always allow if user is authenticated (needed for OAuth flow)
        auth.uid() IS NOT NULL
    );

-- Keep the UPDATE policy restrictive to maintain security
DROP POLICY IF EXISTS "Profiles can be updated by authorized users" ON public.profiles;

CREATE POLICY "Profiles can be updated by authorized users"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (
        -- Users can update their own profile
        user_id = auth.uid()
        -- Super admins can update any profile
        OR public.is_super_admin()
        -- Admins can update profiles in their congregation
        OR (public.has_role(auth.uid(), 'admin') AND congregation_id = public.get_current_congregation_id())
        -- CRITICAL: Allow linking profiles without user_id when email matches
        OR (user_id IS NULL AND LOWER(email) = public.get_current_user_email())
    )
    WITH CHECK (
        -- After update, validate that user_id is current user
        user_id = auth.uid()
        -- Or is super admin
        OR public.is_super_admin()
        -- Or is admin of the congregation
        OR (public.has_role(auth.uid(), 'admin') AND congregation_id = public.get_current_congregation_id())
    );

-- Add a comment explaining the change
COMMENT ON POLICY "Profiles are viewable by authenticated users" ON public.profiles IS 
'Allows all authenticated users to view profiles. This is necessary for OAuth flows to complete successfully. Application-level logic handles showing only relevant profiles to users.';

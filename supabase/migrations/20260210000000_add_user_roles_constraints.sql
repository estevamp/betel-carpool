-- ============================================
-- ADD CONSTRAINTS TO PREVENT ADMIN ASSIGNMENT BEFORE FIRST LOGIN
-- ============================================
-- This migration adds constraints to ensure users have logged in
-- (have a linked user_id) before being assigned admin roles

-- 1. Add check constraint to user_roles table
-- This ensures that only users with valid auth.users entries can have roles
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_must_exist_check
  CHECK (user_id IS NOT NULL);

-- 2. Create a function to validate profile has user_id before admin assignment
-- Note: We cannot use a CHECK constraint with subquery, so we use a trigger instead
CREATE OR REPLACE FUNCTION public.validate_profile_has_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_user_id UUID;
BEGIN
  -- Get the user_id from the profile
  SELECT user_id INTO profile_user_id
  FROM public.profiles
  WHERE id = NEW.profile_id;

  -- Check if profile has a linked user_id
  IF profile_user_id IS NULL THEN
    RAISE EXCEPTION 'Não é possível designar um administrador para um perfil que ainda não fez login. O usuário deve fazer login pelo menos uma vez antes de ser designado como administrador.';
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Create trigger on congregation_administrators to validate before insert
CREATE TRIGGER validate_profile_linked_before_admin_assignment
  BEFORE INSERT ON public.congregation_administrators
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_has_user_id();

-- 4. Add comments to document the constraints
COMMENT ON CONSTRAINT user_roles_user_must_exist_check
  ON public.user_roles IS
  'Ensures that only valid user_id values (not NULL) can have roles assigned';

COMMENT ON TRIGGER validate_profile_linked_before_admin_assignment
  ON public.congregation_administrators IS
  'Validates that a profile has a linked user_id before allowing admin assignment. This ensures users have logged in at least once before being designated as congregation administrators.';

-- Fix RLS for profiles INSERT to allow congregation admins (from congregation_administrators)
-- while keeping congregation boundaries.

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles can be inserted by super admins" ON public.profiles;

CREATE POLICY "Authorized users can insert profiles"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (
        -- User can create their own profile during onboarding
        user_id = auth.uid()
        -- Super-admin can create profiles in any congregation
        OR public.is_super_admin()
        -- Legacy admin role (user_roles) can create profiles in own congregation
        OR (
            public.has_role(auth.uid(), 'admin')
            AND congregation_id = public.get_current_congregation_id()
        )
        -- Congregation admins (source of truth) can create profiles in their congregation
        OR public.is_congregation_admin(congregation_id)
    );

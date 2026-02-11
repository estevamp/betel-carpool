-- ============================================
-- FIX MISSING HAS_ROLE FUNCTION AND RLS POLICIES
-- ============================================

-- 1. Re-create has_role function with proper type handling
-- The error "function public.has_role(uuid, unknown) does not exist" 
-- often happens when the second argument is passed as a string literal 
-- and PostgreSQL can't automatically cast it to the app_role enum.
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role text)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role::text = _role
    )
$$;

-- Also keep the enum version for compatibility if needed, but the text one is safer for JS calls
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    )
$$;

-- 2. Fix RLS for profiles (Allow insert for new users and admins)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id 
        OR public.is_super_admin()
        OR EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role::text = 'admin'
        )
    );

-- 3. Fix RLS for ride_requests (Allow insert)
DROP POLICY IF EXISTS "Users can manage their own ride requests" ON public.ride_requests;
CREATE POLICY "Users can view and delete their own ride requests"
    ON public.ride_requests FOR SELECT
    TO authenticated
    USING (profile_id = public.get_current_profile_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own ride requests"
    ON public.ride_requests FOR INSERT
    TO authenticated
    WITH CHECK (
        profile_id = public.get_current_profile_id() 
        OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Users can update their own ride requests"
    ON public.ride_requests FOR UPDATE
    TO authenticated
    USING (profile_id = public.get_current_profile_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete their own ride requests"
    ON public.ride_requests FOR DELETE
    TO authenticated
    USING (profile_id = public.get_current_profile_id() OR public.has_role(auth.uid(), 'admin'));

-- 4. Fix RLS for trips (Allow insert)
DROP POLICY IF EXISTS "Drivers can create trips" ON public.trips;
CREATE POLICY "Drivers can create trips"
    ON public.trips FOR INSERT
    TO authenticated
    WITH CHECK (
        driver_id = public.get_current_profile_id()
        OR public.has_role(auth.uid(), 'admin')
    );

-- 5. Fix RLS for absences (Allow insert)
DROP POLICY IF EXISTS "Users can manage their own absences" ON public.absences;
CREATE POLICY "Users can view and delete their own absences"
    ON public.absences FOR SELECT
    TO authenticated
    USING (profile_id = public.get_current_profile_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own absences"
    ON public.absences FOR INSERT
    TO authenticated
    WITH CHECK (
        profile_id = public.get_current_profile_id()
        OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Users can update their own absences"
    ON public.absences FOR UPDATE
    TO authenticated
    USING (profile_id = public.get_current_profile_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete their own absences"
    ON public.absences FOR DELETE
    TO authenticated
    USING (profile_id = public.get_current_profile_id() OR public.has_role(auth.uid(), 'admin'));

-- ============================================
-- UPDATE RLS POLICIES FOR CONGREGATION FILTERING
-- ============================================
-- This migration updates RLS policies to filter data by congregation

-- ============================================
-- PROFILES POLICIES
-- ============================================
-- Drop existing policies
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Recreate with congregation filtering
CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        -- Super-admins can see all profiles
        public.is_super_admin()
        -- OR users can see profiles from their own congregation
        OR congregation_id = public.get_current_congregation_id()
        -- OR users can see profiles without congregation (like Visitante)
        OR congregation_id IS NULL
        -- OR authenticated users can see profiles that are unlinked but match their email
        OR (user_id IS NULL AND email = auth.email())
    );

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid()
        OR public.is_super_admin()
    );

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        OR public.is_super_admin()
    );

-- Super-admins and congregation admins can update profiles in their congregation
CREATE POLICY "Admins can update congregation profiles"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (
        public.is_super_admin()
        OR (
            public.has_role(auth.uid(), 'admin')
            AND congregation_id = public.get_current_congregation_id()
        )
    );

-- ============================================
-- USER ROLES POLICIES
-- ============================================
DROP POLICY IF EXISTS "User roles are viewable by authenticated users" ON public.user_roles;
CREATE POLICY "User roles are viewable by authenticated users"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================
-- TRIPS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Trips are viewable by authenticated users" ON public.trips;
DROP POLICY IF EXISTS "Drivers can create trips" ON public.trips;
DROP POLICY IF EXISTS "Drivers can update their own trips" ON public.trips;
DROP POLICY IF EXISTS "Drivers can delete their own trips" ON public.trips;

DROP POLICY IF EXISTS "Trips are viewable by congregation members" ON public.trips;
CREATE POLICY "Trips are viewable by congregation members"
    ON public.trips FOR SELECT
    TO authenticated
    USING (
        true
    );

CREATE POLICY "Drivers can create trips"
    ON public.trips FOR INSERT
    TO authenticated
    WITH CHECK (
        driver_id = public.get_current_profile_id()
        AND (
            public.is_super_admin()
            OR congregation_id = public.get_current_congregation_id()
        )
    );

CREATE POLICY "Drivers can update their own trips"
    ON public.trips FOR UPDATE
    TO authenticated
    USING (
        (driver_id = public.get_current_profile_id() OR public.has_role(auth.uid(), 'admin'))
        AND (
            public.is_super_admin()
            OR congregation_id = public.get_current_congregation_id()
        )
    );

CREATE POLICY "Drivers can delete their own trips"
    ON public.trips FOR DELETE
    TO authenticated
    USING (
        (driver_id = public.get_current_profile_id() OR public.has_role(auth.uid(), 'admin'))
        AND (
            public.is_super_admin()
            OR congregation_id = public.get_current_congregation_id()
        )
    );

-- ============================================
-- ABSENCES POLICIES
-- ============================================
DROP POLICY IF EXISTS "Absences are viewable by authenticated users" ON public.absences;
DROP POLICY IF EXISTS "Users can manage their own absences" ON public.absences;

CREATE POLICY "Absences are viewable by congregation members"
    ON public.absences FOR SELECT
    TO authenticated
    USING (
        public.is_super_admin()
        OR congregation_id = public.get_current_congregation_id()
    );

CREATE POLICY "Users can manage their own absences"
    ON public.absences FOR ALL
    TO authenticated
    USING (
        (profile_id = public.get_current_profile_id() OR public.has_role(auth.uid(), 'admin'))
        AND (
            public.is_super_admin()
            OR congregation_id = public.get_current_congregation_id()
        )
    );

-- ============================================
-- RIDE REQUESTS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Ride requests are viewable by authenticated users" ON public.ride_requests;
DROP POLICY IF EXISTS "Users can manage their own ride requests" ON public.ride_requests;

CREATE POLICY "Ride requests are viewable by congregation members"
    ON public.ride_requests FOR SELECT
    TO authenticated
    USING (
        public.is_super_admin()
        OR congregation_id = public.get_current_congregation_id()
    );

CREATE POLICY "Users can manage their own ride requests"
    ON public.ride_requests FOR ALL
    TO authenticated
    USING (
        (profile_id = public.get_current_profile_id() OR public.has_role(auth.uid(), 'admin'))
        AND (
            public.is_super_admin()
            OR congregation_id = public.get_current_congregation_id()
        )
    )
    WITH CHECK (
        (profile_id = public.get_current_profile_id() OR public.has_role(auth.uid(), 'admin'))
    );

-- ============================================
-- EVACUATION CARS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Evacuation cars are viewable by authenticated users" ON public.evacuation_cars;
DROP POLICY IF EXISTS "Drivers can manage their evacuation cars" ON public.evacuation_cars;

CREATE POLICY "Evacuation cars are viewable by congregation members"
    ON public.evacuation_cars FOR SELECT
    TO authenticated
    USING (
        public.is_super_admin()
        OR congregation_id = public.get_current_congregation_id()
        OR public.is_congregation_admin(congregation_id)
    );

CREATE POLICY "Drivers can manage their evacuation cars"
    ON public.evacuation_cars FOR ALL
    TO authenticated
    USING (
        (driver_id = public.get_current_profile_id() OR public.has_role(auth.uid(), 'admin'))
        AND (
            public.is_super_admin()
            OR congregation_id = public.get_current_congregation_id()
        )
    );

-- ============================================
-- TRANSACTIONS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;

CREATE POLICY "Users can view their own transactions"
    ON public.transactions FOR SELECT
    TO authenticated
    USING (
        public.is_super_admin()
        OR (
            (debtor_id = public.get_current_profile_id() OR creditor_id = public.get_current_profile_id() OR public.has_role(auth.uid(), 'admin'))
            AND congregation_id = public.get_current_congregation_id()
        )
    );

-- ============================================
-- TRANSFERS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view their own transfers" ON public.transfers;
DROP POLICY IF EXISTS "Users can update their transfers as paid" ON public.transfers;

CREATE POLICY "Users can view their own transfers"
    ON public.transfers FOR SELECT
    TO authenticated
    USING (
        public.is_super_admin()
        OR (
            (debtor_id = public.get_current_profile_id() OR creditor_id = public.get_current_profile_id() OR public.has_role(auth.uid(), 'admin'))
            AND congregation_id = public.get_current_congregation_id()
        )
    );

CREATE POLICY "Users can update their transfers as paid"
    ON public.transfers FOR UPDATE
    TO authenticated
    USING (
        (debtor_id = public.get_current_profile_id() OR public.has_role(auth.uid(), 'admin'))
        AND (
            public.is_super_admin()
            OR congregation_id = public.get_current_congregation_id()
        )
    );

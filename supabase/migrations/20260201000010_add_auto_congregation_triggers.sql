-- ============================================
-- ADD TRIGGERS FOR AUTO-CONGREGATION ASSIGNMENT
-- ============================================
-- This migration adds triggers to automatically assign congregation_id
-- to new records based on the user's congregation

-- Function to auto-assign congregation_id to trips
CREATE OR REPLACE FUNCTION public.auto_assign_congregation_to_trip()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- If congregation_id is not set, use the driver's congregation
    IF NEW.congregation_id IS NULL THEN
        NEW.congregation_id := (
            SELECT congregation_id 
            FROM public.profiles 
            WHERE id = NEW.driver_id
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Function to auto-assign congregation_id to absences
CREATE OR REPLACE FUNCTION public.auto_assign_congregation_to_absence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- If congregation_id is not set, use the profile's congregation
    IF NEW.congregation_id IS NULL THEN
        NEW.congregation_id := (
            SELECT congregation_id 
            FROM public.profiles 
            WHERE id = NEW.profile_id
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Function to auto-assign congregation_id to ride_requests
CREATE OR REPLACE FUNCTION public.auto_assign_congregation_to_ride_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- If congregation_id is not set, use the profile's congregation
    IF NEW.congregation_id IS NULL THEN
        NEW.congregation_id := (
            SELECT congregation_id 
            FROM public.profiles 
            WHERE id = NEW.profile_id
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Function to auto-assign congregation_id to evacuation_cars
CREATE OR REPLACE FUNCTION public.auto_assign_congregation_to_evacuation_car()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- If congregation_id is not set, use the driver's congregation
    IF NEW.congregation_id IS NULL THEN
        NEW.congregation_id := (
            SELECT congregation_id 
            FROM public.profiles 
            WHERE id = NEW.driver_id
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Function to auto-assign congregation_id to transactions
CREATE OR REPLACE FUNCTION public.auto_assign_congregation_to_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- If congregation_id is not set, use the debtor's congregation
    IF NEW.congregation_id IS NULL THEN
        NEW.congregation_id := (
            SELECT congregation_id 
            FROM public.profiles 
            WHERE id = NEW.debtor_id
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Function to auto-assign congregation_id to transfers
CREATE OR REPLACE FUNCTION public.auto_assign_congregation_to_transfer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- If congregation_id is not set, use the debtor's congregation
    IF NEW.congregation_id IS NULL THEN
        NEW.congregation_id := (
            SELECT congregation_id 
            FROM public.profiles 
            WHERE id = NEW.debtor_id
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER auto_assign_congregation_to_trip_trigger
    BEFORE INSERT ON public.trips
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_assign_congregation_to_trip();

CREATE TRIGGER auto_assign_congregation_to_absence_trigger
    BEFORE INSERT ON public.absences
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_assign_congregation_to_absence();

CREATE TRIGGER auto_assign_congregation_to_ride_request_trigger
    BEFORE INSERT ON public.ride_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_assign_congregation_to_ride_request();

CREATE TRIGGER auto_assign_congregation_to_evacuation_car_trigger
    BEFORE INSERT ON public.evacuation_cars
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_assign_congregation_to_evacuation_car();

CREATE TRIGGER auto_assign_congregation_to_transaction_trigger
    BEFORE INSERT ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_assign_congregation_to_transaction();

CREATE TRIGGER auto_assign_congregation_to_transfer_trigger
    BEFORE INSERT ON public.transfers
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_assign_congregation_to_transfer();

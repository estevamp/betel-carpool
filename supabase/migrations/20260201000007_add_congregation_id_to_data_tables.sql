-- ============================================
-- ADD CONGREGATION_ID TO DATA TABLES
-- ============================================
-- This migration adds congregation_id to all data tables that need to be filtered by congregation

-- Add congregation_id to trips table
ALTER TABLE public.trips
ADD COLUMN congregation_id UUID REFERENCES public.congregations(id) ON DELETE CASCADE;

-- Add congregation_id to absences table
ALTER TABLE public.absences
ADD COLUMN congregation_id UUID REFERENCES public.congregations(id) ON DELETE CASCADE;

-- Add congregation_id to ride_requests table
ALTER TABLE public.ride_requests
ADD COLUMN congregation_id UUID REFERENCES public.congregations(id) ON DELETE CASCADE;

-- Add congregation_id to evacuation_cars table
ALTER TABLE public.evacuation_cars
ADD COLUMN congregation_id UUID REFERENCES public.congregations(id) ON DELETE CASCADE;

-- Add congregation_id to transactions table
ALTER TABLE public.transactions
ADD COLUMN congregation_id UUID REFERENCES public.congregations(id) ON DELETE CASCADE;

-- Add congregation_id to transfers table
ALTER TABLE public.transfers
ADD COLUMN congregation_id UUID REFERENCES public.congregations(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX idx_trips_congregation_id ON public.trips(congregation_id);
CREATE INDEX idx_absences_congregation_id ON public.absences(congregation_id);
CREATE INDEX idx_ride_requests_congregation_id ON public.ride_requests(congregation_id);
CREATE INDEX idx_evacuation_cars_congregation_id ON public.evacuation_cars(congregation_id);
CREATE INDEX idx_transactions_congregation_id ON public.transactions(congregation_id);
CREATE INDEX idx_transfers_congregation_id ON public.transfers(congregation_id);

-- Note: We're not making congregation_id NOT NULL yet to allow for migration of existing data
-- A future migration can set existing records to a default congregation and then add NOT NULL constraint

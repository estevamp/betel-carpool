-- ============================================
-- ADD CONGREGATION_ID TO PROFILES
-- ============================================
-- This migration adds congregation_id to profiles table

-- Add congregation_id column to profiles
ALTER TABLE public.profiles
ADD COLUMN congregation_id UUID REFERENCES public.congregations(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_profiles_congregation_id ON public.profiles(congregation_id);

-- Note: congregation_id will be NULL for:
-- 1. Super-admins (they can see all congregations)
-- 2. The special "Visitante" profile
-- 3. Profiles not yet assigned to a congregation

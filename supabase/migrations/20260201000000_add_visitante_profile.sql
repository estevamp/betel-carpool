-- ============================================
-- ADD VISITANTE (VISITOR) PROFILE
-- ============================================
-- This migration creates a special "Visitante" profile that can be used
-- when reserving spots for visitors who are not regular betelitas

-- Insert a special Visitante profile (without user_id since it's not a real user)
-- We need to temporarily disable the NOT NULL constraint or use a workaround
-- Since user_id has NOT NULL constraint, we'll modify the table first

-- First, make user_id nullable for the special visitante profile
ALTER TABLE public.profiles ALTER COLUMN user_id DROP NOT NULL;

-- Insert the Visitante profile with a fixed UUID
INSERT INTO public.profiles (id, user_id, full_name, email, is_driver, is_exempt, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    NULL,
    'Visitante',
    NULL,
    FALSE,
    TRUE, -- Exempt from payments
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Update the unique constraint on user_id to allow NULL values
-- Drop the existing unique constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_key;

-- Add a new unique constraint that allows multiple NULLs
CREATE UNIQUE INDEX profiles_user_id_unique_idx ON public.profiles (user_id) WHERE user_id IS NOT NULL;

-- ============================================
-- Allow NULL user_id in profiles table
-- ============================================
-- This allows creating profiles for invited users before they accept the invite
-- The user_id will be linked when they first log in

-- First, update any profiles that have both user_id and email as NULL
-- Set email from auth.users if possible
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id
  AND p.email IS NULL;

-- For any remaining profiles with NULL email and NULL user_id,
-- we need to set a placeholder email or delete them
-- Let's set a placeholder email based on the profile id
UPDATE public.profiles
SET email = 'placeholder-' || id::text || '@betel-carpool.local'
WHERE email IS NULL AND user_id IS NULL;

-- Drop the NOT NULL constraint on user_id
ALTER TABLE public.profiles
  ALTER COLUMN user_id DROP NOT NULL;

-- Add a check constraint to ensure either user_id is set OR email is set
-- This ensures we can always identify a profile
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_id_or_email_check
  CHECK (user_id IS NOT NULL OR email IS NOT NULL);

-- Create an index on email for faster lookups when linking profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email)
  WHERE user_id IS NULL;

-- Note: The unique constraint on user_id already exists and PostgreSQL
-- automatically allows multiple NULL values in UNIQUE constraints,
-- so we don't need to recreate it

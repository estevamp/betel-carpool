-- ============================================
-- UPDATE PROFILES RLS FOR LINKING
-- ============================================

-- Drop existing RLS policies for profiles to redefine them
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Allow authenticated users to update their own profile (including linking user_id)
CREATE POLICY "Users can update their own profile or link existing profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid() OR (user_id IS NULL AND email = auth.email()));

-- Allow authenticated users to insert their own profile (only if user_id is auth.uid())
-- This policy is less restrictive than before, but still ensures a user can only insert their own.
-- However, the application logic should prevent direct inserts by users if profiles are pre-created by admins.
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());


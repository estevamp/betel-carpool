-- ============================================
-- ADD SUPER_ADMIN ROLE
-- ============================================
-- This migration adds the super_admin role to the app_role enum

-- Add super_admin to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- Update has_role function to support super_admin
-- (The existing function already works, no changes needed)

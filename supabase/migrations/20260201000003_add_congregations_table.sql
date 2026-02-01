-- ============================================
-- ADD CONGREGATIONS TABLE
-- ============================================
-- This migration creates the congregations table to support multi-congregation system

-- Create congregations table
CREATE TABLE public.congregations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add trigger for updated_at
CREATE TRIGGER update_congregations_updated_at
    BEFORE UPDATE ON public.congregations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.congregations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for congregations
-- Super-admins can see all congregations
-- Regular admins can only see their own congregation
-- Regular users can only see their own congregation
CREATE POLICY "Congregations are viewable by authenticated users"
    ON public.congregations FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only super-admins can insert congregations"
    ON public.congregations FOR INSERT
    TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Only super-admins can update congregations"
    ON public.congregations FOR UPDATE
    TO authenticated
    USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Only super-admins can delete congregations"
    ON public.congregations FOR DELETE
    TO authenticated
    USING (public.has_role(auth.uid(), 'super_admin'));

-- Create index for performance
CREATE INDEX idx_congregations_name ON public.congregations(name);

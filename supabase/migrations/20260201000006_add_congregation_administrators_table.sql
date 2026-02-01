-- ============================================
-- ADD CONGREGATION_ADMINISTRATORS TABLE
-- ============================================
-- This migration creates the congregation_administrators table
-- to link profiles to congregations they administer

-- Create congregation_administrators table
CREATE TABLE public.congregation_administrators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    congregation_id UUID NOT NULL REFERENCES public.congregations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (profile_id, congregation_id)
);

-- Add trigger for updated_at
CREATE TRIGGER update_congregation_administrators_updated_at
    BEFORE UPDATE ON public.congregation_administrators
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.congregation_administrators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for congregation_administrators
-- Super-admins can see all congregation administrators
-- Regular admins can only see administrators of their own congregation
CREATE POLICY "Congregation administrators are viewable by authenticated users"
    ON public.congregation_administrators FOR SELECT
    TO authenticated
    USING (
        -- Super-admins can see all
        public.has_role(auth.uid(), 'super_admin')
        -- OR admins can see their own congregation's administrators
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = public.get_current_profile_id()
            AND congregation_id = congregation_administrators.congregation_id
            AND public.has_role(auth.uid(), 'admin')
        )
    );

CREATE POLICY "Only super-admins can insert congregation administrators"
    ON public.congregation_administrators FOR INSERT
    TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Only super-admins can update congregation administrators"
    ON public.congregation_administrators FOR UPDATE
    TO authenticated
    USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Only super-admins can delete congregation administrators"
    ON public.congregation_administrators FOR DELETE
    TO authenticated
    USING (public.has_role(auth.uid(), 'super_admin'));

-- Create indexes for performance
CREATE INDEX idx_congregation_administrators_profile_id ON public.congregation_administrators(profile_id);
CREATE INDEX idx_congregation_administrators_congregation_id ON public.congregation_administrators(congregation_id);

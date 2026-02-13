-- Update RLS policies for congregation_administrators to allow congregation admins to manage admins in their own congregation

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Only super-admins can insert congregation administrators" ON public.congregation_administrators;
DROP POLICY IF EXISTS "Only super-admins can update congregation administrators" ON public.congregation_administrators;
DROP POLICY IF EXISTS "Only super-admins can delete congregation administrators" ON public.congregation_administrators;

-- New INSERT policy: Super-admins OR congregation admins of the same congregation
CREATE POLICY "Admins can insert congregation administrators"
    ON public.congregation_administrators FOR INSERT
    TO authenticated
    WITH CHECK (
        public.has_role(auth.uid(), 'super_admin')
        OR (
            public.has_role(auth.uid(), 'admin')
            AND EXISTS (
                SELECT 1 FROM public.profiles
                WHERE user_id = auth.uid()
                AND congregation_id = congregation_administrators.congregation_id
            )
        )
    );

-- New UPDATE policy: Super-admins OR congregation admins of the same congregation
CREATE POLICY "Admins can update congregation administrators"
    ON public.congregation_administrators FOR UPDATE
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'super_admin')
        OR (
            public.has_role(auth.uid(), 'admin')
            AND EXISTS (
                SELECT 1 FROM public.profiles
                WHERE user_id = auth.uid()
                AND congregation_id = congregation_administrators.congregation_id
            )
        )
    );

-- New DELETE policy: Super-admins OR congregation admins of the same congregation
CREATE POLICY "Admins can delete congregation administrators"
    ON public.congregation_administrators FOR DELETE
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'super_admin')
        OR (
            public.has_role(auth.uid(), 'admin')
            AND EXISTS (
                SELECT 1 FROM public.profiles
                WHERE user_id = auth.uid()
                AND congregation_id = congregation_administrators.congregation_id
            )
        )
    );

-- Drop a política de visualização existente para evitar conflitos
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

-- Drop a política de atualização existente para evitar conflitos
DROP POLICY IF EXISTS "Profiles can be updated by authorized users" ON public.profiles;

-- recria a política SELECT sem a dependência recursiva
CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        -- Super administradores podem visualizar todos os perfis
        public.is_super_admin()
        -- Administradores podem visualizar perfis em sua congregação
        OR (public.has_role(auth.uid(), 'admin') AND congregation_id = public.get_current_congregation_id())
        -- Usuários podem visualizar perfis em sua própria congregação
        OR congregation_id = public.get_current_congregation_id()
        -- Usuários podem visualizar seu próprio perfil
        OR user_id = auth.uid()
        -- Permite que os usuários encontrem um perfil com seu e-mail para vinculá-lo
        OR (user_id IS NULL AND LOWER(email) = LOWER(public.get_current_user_email()))
    );

-- Recria a política de ATUALIZAÇÃO sem a dependência recursiva
CREATE POLICY "Profiles can be updated by authorized users"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (
        -- Usuários podem atualizar seu próprio perfil
        user_id = auth.uid()
        -- Super administradores podem atualizar qualquer perfil
        OR public.is_super_admin()
        -- Administradores podem atualizar perfis em sua congregação
        OR (public.has_role(auth.uid(), 'admin') AND congregation_id = public.get_current_congregation_id())
        -- Permite que os usuários vinculem um perfil existente com seu e-mail
        OR (user_id IS NULL AND LOWER(email) = LOWER(public.get_current_user_email()))
    )
    WITH CHECK (
        -- Garante que as atualizações sigam as mesmas regras de permissão
        user_id = auth.uid()
        OR public.is_super_admin()
        OR (public.has_role(auth.uid(), 'admin') AND congregation_id = public.get_current_congregation_id())
        OR (user_id IS NULL AND LOWER(email) = LOWER(public.get_current_user_email()))
    );

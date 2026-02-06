-- Permite vincular user_id a profiles que têm congregation_id mas não têm user_id
-- Versão simplificada que foca apenas na vinculação inicial

-- Drop a política de atualização existente
DROP POLICY IF EXISTS "Profiles can be updated by authorized users" ON public.profiles;

-- Recria a política de ATUALIZAÇÃO com lógica simplificada
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
        -- CRÍTICO: Permite que os usuários vinculem um perfil existente com seu e-mail
        -- Isso funciona quando user_id é NULL e o email corresponde
        OR (user_id IS NULL AND LOWER(email) = LOWER(public.get_current_user_email()))
    )
    WITH CHECK (
        -- WITH CHECK valida o estado APÓS a atualização
        -- Permite se o novo user_id é o usuário atual
        user_id = auth.uid()
        -- Ou se é super admin
        OR public.is_super_admin()
        -- Ou se é admin da congregação
        OR (public.has_role(auth.uid(), 'admin') AND congregation_id = public.get_current_congregation_id())
    );

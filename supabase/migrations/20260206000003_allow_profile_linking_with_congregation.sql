-- Permite vincular user_id a profiles que têm congregation_id mas não têm user_id
-- Isso é necessário para o fluxo onde um admin cria um profile com congregation_id
-- e depois o usuário faz login e precisa vincular seu user_id ao profile

-- Drop a política de atualização existente
DROP POLICY IF EXISTS "Profiles can be updated by authorized users" ON public.profiles;

-- Recria a política de ATUALIZAÇÃO permitindo vincular profiles com congregation_id
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
        -- mesmo que o profile já tenha congregation_id (mas não tenha user_id)
        OR (user_id IS NULL AND LOWER(email) = LOWER(public.get_current_user_email()))
    )
    WITH CHECK (
        -- Garante que as atualizações sigam as mesmas regras de permissão
        -- IMPORTANTE: WITH CHECK valida o estado APÓS a atualização
        -- Por isso, verificamos se o novo user_id é o usuário atual OU se o email corresponde
        (user_id = auth.uid() AND LOWER(email) = LOWER(public.get_current_user_email()))
        OR public.is_super_admin()
        OR (public.has_role(auth.uid(), 'admin') AND congregation_id = public.get_current_congregation_id())
    );

-- Diagnóstico e correção da política RLS para vinculação de profiles
-- O problema pode estar na função get_current_user_email() ou na lógica do WITH CHECK

-- Primeiro, vamos verificar e recriar a função get_current_user_email
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Tenta pegar o email do JWT
  SELECT auth.jwt() ->> 'email' INTO user_email;
  
  -- Se não conseguir do JWT, tenta da tabela auth.users
  IF user_email IS NULL THEN
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = auth.uid();
  END IF;
  
  RETURN user_email;
END;
$$;

-- Drop a política de atualização existente
DROP POLICY IF EXISTS "Profiles can be updated by authorized users" ON public.profiles;

-- Recria a política de ATUALIZAÇÃO com lógica mais permissiva para vinculação
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
        -- CRÍTICO: Permite vincular profiles sem user_id quando o email corresponde
        OR (user_id IS NULL AND LOWER(email) = LOWER(public.get_current_user_email()))
    )
    WITH CHECK (
        -- WITH CHECK mais permissivo: permite se o user_id resultante é o usuário atual
        -- OU se é super admin OU se é admin da congregação
        user_id = auth.uid()
        OR public.is_super_admin()
        OR (public.has_role(auth.uid(), 'admin') AND congregation_id = public.get_current_congregation_id())
    );

-- Adiciona um comentário explicativo
COMMENT ON POLICY "Profiles can be updated by authorized users" ON public.profiles IS 
'Permite que usuários atualizem seus próprios perfis, admins atualizem perfis de sua congregação, e permite vinculação de profiles sem user_id quando o email corresponde ao usuário autenticado.';

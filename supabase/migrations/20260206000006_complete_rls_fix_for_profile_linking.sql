-- Correção completa das políticas RLS para permitir vinculação de profiles
-- Esta migration garante que tanto SELECT quanto UPDATE permitam o fluxo de vinculação

-- Recria a função get_current_user_email com melhor tratamento de erros
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
  
  RETURN LOWER(user_email);
END;
$$;

-- Drop todas as políticas existentes para profiles
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles can be updated by authorized users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles can be inserted by super admins" ON public.profiles;
DROP POLICY IF EXISTS "Profiles can be deleted by super admins" ON public.profiles;

-- Recria política SELECT permitindo visualizar profiles para vinculação
CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        -- Super admins podem ver todos
        public.is_super_admin()
        -- Admins podem ver profiles de sua congregação
        OR (public.has_role(auth.uid(), 'admin') AND congregation_id = public.get_current_congregation_id())
        -- Usuários podem ver profiles de sua congregação
        OR congregation_id = public.get_current_congregation_id()
        -- Usuários podem ver seu próprio profile
        OR user_id = auth.uid()
        -- CRÍTICO: Usuários podem ver profiles com seu email (para vinculação)
        OR LOWER(email) = public.get_current_user_email()
    );

-- Recria política UPDATE permitindo vinculação
CREATE POLICY "Profiles can be updated by authorized users"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (
        -- Usuários podem atualizar seu próprio perfil
        user_id = auth.uid()
        -- Super admins podem atualizar qualquer perfil
        OR public.is_super_admin()
        -- Admins podem atualizar profiles de sua congregação
        OR (public.has_role(auth.uid(), 'admin') AND congregation_id = public.get_current_congregation_id())
        -- CRÍTICO: Permite vincular profiles sem user_id quando email corresponde
        OR (user_id IS NULL AND LOWER(email) = public.get_current_user_email())
    )
    WITH CHECK (
        -- Após atualização, valida que o user_id é do usuário atual
        user_id = auth.uid()
        -- Ou é super admin
        OR public.is_super_admin()
        -- Ou é admin da congregação
        OR (public.has_role(auth.uid(), 'admin') AND congregation_id = public.get_current_congregation_id())
    );

-- Recria política INSERT
CREATE POLICY "Profiles can be inserted by super admins"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR public.has_role(auth.uid(), 'admin')
    );

-- Recria política DELETE
CREATE POLICY "Profiles can be deleted by super admins"
    ON public.profiles FOR DELETE
    TO authenticated
    USING (public.is_super_admin());

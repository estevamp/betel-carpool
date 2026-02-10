-- Fix 406 error when linking profiles
-- The issue is that the WITH CHECK clause is too restrictive
-- It prevents linking a profile when user_id is being set from NULL to auth.uid()

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Profiles can be updated by authorized users" ON public.profiles;

-- Recreate UPDATE policy with corrected WITH CHECK clause
CREATE POLICY "Profiles can be updated by authorized users"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (
        -- Usuários podem atualizar seu próprio perfil (já vinculado)
        user_id = auth.uid()
        -- Super admins podem atualizar qualquer perfil
        OR public.is_super_admin()
        -- Admins podem atualizar profiles de sua congregação
        OR (public.has_role(auth.uid(), 'admin') AND congregation_id = public.get_current_congregation_id())
        -- CRÍTICO: Permite vincular profiles sem user_id quando email corresponde
        OR (user_id IS NULL AND LOWER(email) = public.get_current_user_email())
    )
    WITH CHECK (
        -- CORREÇÃO: Permite que user_id seja definido para auth.uid() durante vinculação
        -- Ou que o perfil já pertença ao usuário atual
        (user_id = auth.uid() OR user_id IS NULL)
        -- Ou é super admin
        OR public.is_super_admin()
        -- Ou é admin da congregação
        OR (public.has_role(auth.uid(), 'admin') AND congregation_id = public.get_current_congregation_id())
    );

-- Adiciona comentário explicativo
COMMENT ON POLICY "Profiles can be updated by authorized users" ON public.profiles IS 
'Permite que usuários vinculem profiles sem user_id ao fazer login, desde que o email corresponda. O WITH CHECK permite user_id = auth.uid() ou NULL para não bloquear a vinculação inicial.';

-- Script para corrigir a política de visualização de administradores
-- Execute este script no SQL Editor do Supabase

-- 1. Remover a política antiga
DROP POLICY IF EXISTS "Congregation administrators are viewable by authenticated users" ON public.congregation_administrators;

-- 2. Criar a nova política corrigida
CREATE POLICY "Congregation administrators are viewable by authenticated users"
    ON public.congregation_administrators FOR SELECT
    TO authenticated
    USING (
        -- Super-admins podem ver tudo
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'super_admin'
        )
        -- OU Admins podem ver os administradores da sua própria congregação
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid()
            AND congregation_id = congregation_administrators.congregation_id
            AND EXISTS (
                SELECT 1 FROM public.user_roles
                WHERE user_id = auth.uid()
                AND role = 'admin'
            )
        )
    );

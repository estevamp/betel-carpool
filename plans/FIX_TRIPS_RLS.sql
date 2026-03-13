-- Script para corrigir a visualização de viagens (Trips)
-- Execute este script no SQL Editor do Supabase

-- 1. Remover a política de visualização de viagens que pode estar restritiva
DROP POLICY IF EXISTS "Trips are viewable by congregation members" ON public.trips;
DROP POLICY IF EXISTS "Trips are viewable by authenticated users" ON public.trips;

-- 2. Criar uma nova política que garante visibilidade correta
CREATE POLICY "Trips are viewable by congregation members"
    ON public.trips FOR SELECT
    TO authenticated
    USING (
        -- Super-admins podem ver todas as viagens
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'super_admin'
        )
        -- OU Usuários podem ver viagens da sua própria congregação
        OR congregation_id IN (
            SELECT congregation_id FROM public.profiles
            WHERE user_id = auth.uid()
        )
        -- OU Usuários que são administradores de uma congregação podem ver as viagens dela
        OR congregation_id IN (
            SELECT ca.congregation_id 
            FROM public.congregation_administrators ca
            JOIN public.profiles p ON ca.profile_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

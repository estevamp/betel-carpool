-- Script para corrigir a adição de passageiros (Trip Passengers)
-- Execute este script no SQL Editor do Supabase

-- 1. Remover as políticas antigas que podem estar causando conflito ou usando funções instáveis
DROP POLICY IF EXISTS "Users or drivers can add passengers" ON public.trip_passengers;
DROP POLICY IF EXISTS "Trip passengers are viewable by authenticated users" ON public.trip_passengers;

-- 2. Criar política de visualização (SELECT)
CREATE POLICY "Trip passengers are viewable by authenticated users"
    ON public.trip_passengers FOR SELECT
    TO authenticated
    USING (true);

-- 3. Criar política de inserção (INSERT) simplificada e robusta
CREATE POLICY "Users or drivers can add passengers"
    ON public.trip_passengers FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Super-admins podem tudo
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'super_admin'
        )
        -- OU O usuário está se adicionando (usando subquery direta para evitar recursão de função)
        OR passenger_id IN (
            SELECT id FROM public.profiles WHERE user_id = auth.uid()
        )
        -- OU O motorista da viagem está adicionando alguém
        OR EXISTS (
            SELECT 1 FROM public.trips t
            JOIN public.profiles p ON t.driver_id = p.id
            WHERE t.id = trip_id 
            AND p.user_id = auth.uid()
        )
        -- OU Um administrador da congregação da viagem está adicionando alguém
        OR EXISTS (
            SELECT 1 FROM public.trips t
            JOIN public.congregation_administrators ca ON t.congregation_id = ca.congregation_id
            JOIN public.profiles p ON ca.profile_id = p.id
            WHERE t.id = trip_id
            AND p.user_id = auth.uid()
        )
    );

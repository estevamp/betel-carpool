-- Adiciona configurações de bloqueio de alterações de viagem por congregação

-- Adiciona as novas chaves de configuração para cada congregação existente
INSERT INTO public.settings (key, value, type, congregation_id)
SELECT 'trip_lock_enabled', 'false', 'boolean', id
FROM public.congregations
ON CONFLICT (key, congregation_id) DO NOTHING;

INSERT INTO public.settings (key, value, type, congregation_id)
SELECT 'trip_lock_hours', '2', 'integer', id
FROM public.congregations
ON CONFLICT (key, congregation_id) DO NOTHING;

-- Atualiza o trigger de criação de defaults para novas congregações
CREATE OR REPLACE FUNCTION public.create_default_settings_for_congregation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.settings (key, value, type, congregation_id) VALUES
        ('trip_value',          '15.00', 'decimal',  NEW.id),
        ('show_transport_help', 'true',  'boolean',  NEW.id),
        ('max_passengers',      '4',     'integer',  NEW.id),
        ('closing_day',         '31',    'integer',  NEW.id),
        ('trip_lock_enabled',   'false', 'boolean',  NEW.id),
        ('trip_lock_hours',     '2',     'integer',  NEW.id)
    ON CONFLICT (key, congregation_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

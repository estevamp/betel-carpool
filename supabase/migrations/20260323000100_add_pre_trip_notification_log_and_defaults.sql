-- Add defaults and delivery log support for pre-trip notifications

INSERT INTO public.settings (key, value, type, congregation_id)
SELECT 'pre_trip_notification_enabled', 'false', 'boolean', id
FROM public.congregations
ON CONFLICT (key, congregation_id) DO NOTHING;

INSERT INTO public.settings (key, value, type, congregation_id)
SELECT 'pre_trip_notification_minutes', '60', 'integer', id
FROM public.congregations
ON CONFLICT (key, congregation_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.trip_notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (notification_type, trip_id, user_id)
);

ALTER TABLE public.trip_notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages trip notification logs" ON public.trip_notification_logs;

CREATE POLICY "Service role manages trip notification logs"
ON public.trip_notification_logs
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_trip_notification_logs_trip_type
ON public.trip_notification_logs (trip_id, notification_type);

CREATE INDEX IF NOT EXISTS idx_trip_notification_logs_user_type
ON public.trip_notification_logs (user_id, notification_type);

CREATE OR REPLACE FUNCTION public.create_default_settings_for_congregation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.settings (key, value, type, congregation_id) VALUES
        ('trip_value',                   '15.00', 'decimal', NEW.id),
        ('show_transport_help',          'true',  'boolean', NEW.id),
        ('max_passengers',               '4',     'integer', NEW.id),
        ('closing_day',                  '31',    'integer', NEW.id),
        ('trip_lock_enabled',            'false', 'boolean', NEW.id),
        ('trip_lock_hours',              '2',     'integer', NEW.id),
        ('pre_trip_notification_enabled','false', 'boolean', NEW.id),
        ('pre_trip_notification_minutes','60',    'integer', NEW.id)
    ON CONFLICT (key, congregation_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
